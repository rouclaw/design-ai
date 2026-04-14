import type { JSONSchema } from "./schema-to-ts";

export enum Kind {
  String,
  Number,
  Boolean,
  Const,
  Enum,
  Array,
  Object,
  Union,
  Intersection,
  Ref,
}

export type ValidatorType = {
  validationMessage?: string;
  errorTransform?: string;
} & (
  | { kind: Kind.String; pattern?: string }
  | { kind: Kind.Number }
  | { kind: Kind.Boolean }
  | { kind: Kind.Const; value: unknown }
  | { kind: Kind.Enum; values: unknown[] }
  | {
      kind: Kind.Array;
      items: ValidatorType;
      minItems?: number;
      maxItems?: number;
    }
  | {
      kind: Kind.Object;
      properties: ObjectProperty[];
      additionalProperties?: ValidatorType | boolean;
      patternProperties?: PatternProperty[];
      propertyNames?: ValidatorType;
    }
  | { kind: Kind.Union; variants: ValidatorType[] }
  | { kind: Kind.Intersection; parts: ValidatorType[] }
  | { kind: Kind.Ref; name: string }
);

export type ObjectProperty = {
  name: string;
  type: ValidatorType;
  required: boolean;
};

export type PatternProperty = {
  pattern: string;
  type: ValidatorType;
};

export type CollectedTypes = Map<string, ValidatorType>;

type Context = {
  definitions: Record<string, JSONSchema>;
  visiting: Set<string>;
  collected: Map<string, ValidatorType>;
};

export function convertJSONSchemaToValidator(schema: JSONSchema): string {
  const types = collectTypes(schema);
  return generateCode(types);
}

function collectTypes(schema: JSONSchema): CollectedTypes {
  const context: Context = {
    definitions: schema.$defs ?? {},
    visiting: new Set(),
    collected: new Map(),
  };

  const resolved = resolveSchema(context, schema);
  if (!resolved) {
    throw new Error("Root schema did not resolve to a type");
  }
  context.collected.set("document", resolved);

  // Mixin types used as allOf refs get their additionalProperties stripped.
  // The parent type's inline Object part handles the combined check via parentType.
  for (const type of context.collected.values()) {
    if (type.kind !== Kind.Intersection) {
      continue;
    }
    for (const part of type.parts) {
      if (part.kind === Kind.Ref) {
        const refType = context.collected.get(part.name);
        if (refType) {
          clearAdditionalProperties(refType);
        }
      }
    }
  }

  return context.collected;
}

function clearAdditionalProperties(type: ValidatorType): void {
  if (type.kind === Kind.Object) {
    type.additionalProperties = undefined;
  } else if (type.kind === Kind.Intersection) {
    for (const part of type.parts) {
      clearAdditionalProperties(part);
    }
  }
}

function resolveInner(
  context: Context,
  schema: JSONSchema,
): ValidatorType | undefined {
  if (schema.oneOf) {
    return {
      kind: Kind.Union,
      variants: schema.oneOf
        .map((s) => resolveSchema(context, s))
        .filter((s): s is ValidatorType => s != null),
      validationMessage: schema._validationMessage,
      errorTransform: schema._errorTransform,
    };
  }

  if (schema.allOf) {
    const parts: ValidatorType[] = schema.allOf
      .map((s) => resolveSchema(context, s))
      .filter((s): s is ValidatorType => s != null);

    if (schema.properties) {
      parts.push(resolveObject(context, schema));
    }

    return {
      kind: Kind.Intersection,
      parts,
      validationMessage: schema._validationMessage,
      errorTransform: schema._errorTransform,
    };
  }

  if (schema.const !== undefined) {
    return {
      kind: Kind.Const,
      value: schema.const,
      validationMessage: schema._validationMessage,
      errorTransform: schema._errorTransform,
    };
  }

  if (schema.enum) {
    return {
      kind: Kind.Enum,
      values: schema.enum,
      validationMessage: schema._validationMessage,
      errorTransform: schema._errorTransform,
    };
  }

  if (schema.type) {
    switch (schema.type) {
      case "string":
        return {
          kind: Kind.String,
          pattern: schema.pattern,
          validationMessage: schema._validationMessage,
          errorTransform: schema._errorTransform,
        };
      case "number":
        return {
          kind: Kind.Number,
          validationMessage: schema._validationMessage,
          errorTransform: schema._errorTransform,
        };
      case "boolean":
        return {
          kind: Kind.Boolean,
          validationMessage: schema._validationMessage,
          errorTransform: schema._errorTransform,
        };
      case "array": {
        if (!schema.items) {
          throw new Error("Array schema missing 'items'");
        }

        const items = resolveSchema(context, schema.items);
        if (!items) {
          throw new Error("Array items schema did not resolve to a type");
        }

        return {
          kind: Kind.Array,
          items,
          minItems: schema.minItems,
          maxItems: schema.maxItems,
          validationMessage: schema._validationMessage,
          errorTransform: schema._errorTransform,
        };
      }
      case "object": {
        return resolveObject(context, schema, schema._validationMessage);
      }

      default: {
        throw new Error(`Unsupported or missing type: ${schema.type}`);
      }
    }
  }
}

function resolveSchema(
  context: Context,
  schema: JSONSchema,
): ValidatorType | undefined {
  let ref: ValidatorType | undefined;
  if (schema.$ref) {
    const name = schema.$ref.replace("#/$defs/", "");

    const defSchema = context.definitions[name];
    if (!defSchema) {
      throw new Error(`Reference not found: '${schema.$ref}'`);
    }

    if (!context.collected.has(name) && !context.visiting.has(name)) {
      context.visiting.add(name);
      const resolved = resolveSchema(context, defSchema);
      if (!resolved) {
        throw new Error(`Schema for '${name}' did not resolve to a type`);
      }
      context.collected.set(name, resolved);
      context.visiting.delete(name);
    }

    ref = {
      kind: Kind.Ref,
      name,
      validationMessage: schema._validationMessage,
      errorTransform:
        schema._errorTransform ?? context.definitions[name]?._errorTransform,
    };
  }

  const inner = resolveInner(context, schema);
  if (inner) {
    if (ref) {
      return {
        kind: Kind.Intersection,
        parts: [ref, inner],
        validationMessage: schema._validationMessage,
        errorTransform: schema._errorTransform,
      };
    }

    return inner;
  }

  return ref;
}

function resolveObject(
  context: Context,
  schema: JSONSchema,
  validationMessage?: string,
): ValidatorType {
  const requiredSet = new Set(schema.required ?? []);

  const properties: ObjectProperty[] = [];
  if (schema.properties) {
    for (const [name, propSchema] of Object.entries(schema.properties)) {
      const type = resolveSchema(context, propSchema);
      if (!type) {
        throw new Error(`Property '${name}' schema did not resolve to a type`);
      }
      properties.push({
        name,
        type,
        required: requiredSet.has(name),
      });
    }
  }

  let additionalProperties: ValidatorType | boolean | undefined;
  if (schema.additionalProperties === false) {
    additionalProperties = false;
  } else if (
    schema.additionalProperties &&
    typeof schema.additionalProperties !== "boolean"
  ) {
    additionalProperties = resolveSchema(context, schema.additionalProperties);
  }

  let patternProperties: PatternProperty[] | undefined;
  if (schema.patternProperties) {
    patternProperties = [];
    for (const [pattern, propSchema] of Object.entries(
      schema.patternProperties,
    )) {
      const type = resolveSchema(context, propSchema);
      if (!type) {
        throw new Error(
          `Pattern property '${pattern}' schema did not resolve to a type`,
        );
      }
      patternProperties.push({
        pattern,
        type,
      });
    }
  }

  const propertyNames = schema.propertyNames
    ? resolveSchema(context, schema.propertyNames)
    : undefined;

  return {
    kind: Kind.Object,
    properties,
    additionalProperties,
    patternProperties,
    propertyNames,
    validationMessage,
  };
}

type CodeGen = {
  types: CollectedTypes;
  lines: string[];
  indent: number;
  varCounter: number;
  regexps: Map<string, string>;
  regexpCounter: number;
};

function generateCode(types: CollectedTypes): string {
  const gen: CodeGen = {
    types,
    lines: [],
    indent: 0,
    varCounter: 0,
    regexps: new Map(),
    regexpCounter: 0,
  };

  emit(gen, `export type ValidationError = { path: string; message: string };`);
  emit(gen, ``);
  emit(
    gen,
    `export type ValidationContext = { errors: ValidationError[]; partial: boolean; transform?: (tag: string, value: unknown) => unknown };`,
  );
  emit(gen, ``);

  for (const [name, type] of types) {
    emit(
      gen,
      `export function ${validatorName(name)}(v: unknown, ctx: ValidationContext, path: string): void {`,
    );
    gen.indent++;
    emitCheck(gen, type, "v", "path", "ctx");
    gen.indent--;
    emit(gen, `}`);
    emit(gen, ``);
  }

  for (const [pattern, name] of gen.regexps) {
    emit(gen, `const ${name} = new RegExp(${JSON.stringify(pattern)});`);
  }

  return gen.lines.join("\n");
}

function getOrCreateRegexp(gen: CodeGen, pattern: string): string {
  let name = gen.regexps.get(pattern);
  if (!name) {
    name = `_re${gen.regexpCounter++}`;
    gen.regexps.set(pattern, name);
  }
  return name;
}

function emit(gen: CodeGen, line: string): void {
  if (line === "") {
    gen.lines.push("");
    return;
  }
  gen.lines.push("  ".repeat(gen.indent) + line);
}

function nextVar(gen: CodeGen): string {
  return `_v${gen.varCounter++}`;
}

function validatorName(name: string): string {
  return `validate_${name.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

function emitError(
  gen: CodeGen,
  errors: string,
  path: string,
  message: string,
  value: string,
): void {
  emit(
    gen,
    `${errors}.push({ path: ${path}, message: ${message} + ", got " + JSON.stringify(${value}) });`,
  );
}

function emitCheck(
  gen: CodeGen,
  type: ValidatorType,
  accessor: string,
  path: string,
  ctx: string,
  parentType?: ValidatorType,
): void {
  const errors = `${ctx}.errors`;
  const customMsg = type.validationMessage
    ? JSON.stringify(`expected ${type.validationMessage}`)
    : undefined;

  switch (type.kind) {
    case Kind.String: {
      emit(gen, `if (typeof ${accessor} !== "string") {`);
      gen.indent++;
      emitError(gen, errors, path, customMsg ?? `"expected string"`, accessor);
      gen.indent--;
      if (type.pattern) {
        const patternMsg =
          customMsg ??
          JSON.stringify(`expected to match pattern ${type.pattern}`);
        emit(
          gen,
          `} else if (!${getOrCreateRegexp(gen, type.pattern)}.test(${accessor})) {`,
        );
        gen.indent++;
        emitError(gen, errors, path, patternMsg, accessor);
        gen.indent--;
      }
      emit(gen, `}`);
      return;
    }

    case Kind.Number:
    case Kind.Boolean: {
      const t = type.kind === Kind.Number ? "number" : "boolean";
      emit(gen, `if (typeof ${accessor} !== "${t}") {`);
      gen.indent++;
      emitError(gen, errors, path, customMsg ?? `"expected ${t}"`, accessor);
      gen.indent--;
      emit(gen, `}`);
      return;
    }

    case Kind.Const: {
      emit(gen, `if (${accessor} !== ${JSON.stringify(type.value)}) {`);
      gen.indent++;
      emitError(
        gen,
        errors,
        path,
        customMsg ??
          `"expected " + ${JSON.stringify(JSON.stringify(type.value))}`,
        accessor,
      );
      gen.indent--;
      emit(gen, `}`);
      return;
    }

    case Kind.Enum: {
      const checks = type.values
        .map((v) => `${accessor} !== ${JSON.stringify(v)}`)
        .join(" && ");

      const valuesStr = type.values.map((v) => JSON.stringify(v)).join(", ");
      emit(gen, `if (${checks}) {`);
      gen.indent++;
      emitError(
        gen,
        errors,
        path,
        customMsg ?? JSON.stringify(`expected one of: ${valuesStr}`),
        accessor,
      );
      gen.indent--;
      emit(gen, `}`);
      return;
    }

    case Kind.Ref: {
      emit(gen, `${validatorName(type.name)}(${accessor}, ${ctx}, ${path});`);
      return;
    }

    case Kind.Union: {
      emitUnionCheck(
        gen,
        type.variants,
        accessor,
        path,
        ctx,
        type.validationMessage,
      );
      return;
    }

    case Kind.Intersection: {
      for (const part of type.parts) {
        emitCheck(gen, part, accessor, path, ctx, type);
      }
      return;
    }

    case Kind.Array: {
      emitArrayCheck(gen, type, accessor, path, ctx);
      return;
    }

    case Kind.Object: {
      emitObjectCheck(gen, type, accessor, path, ctx, false, parentType);
      return;
    }

    default: {
      const missing: never = type;
      throw new Error(`Unhandled kind: ${(missing as ValidatorType).kind}`);
    }
  }
}

type JSType = "string" | "number" | "boolean" | "array" | "object" | null;

function findErrorTransform(
  types: CollectedTypes,
  type: ValidatorType,
): string | undefined {
  if (type.errorTransform) return type.errorTransform;
  switch (type.kind) {
    case Kind.Ref: {
      const resolved = types.get(type.name);
      if (resolved) return findErrorTransform(types, resolved);
      return undefined;
    }
    case Kind.Union: {
      for (const v of type.variants) {
        const errorTransform = findErrorTransform(types, v);
        if (errorTransform) return errorTransform;
      }
      return undefined;
    }
    case Kind.Intersection: {
      for (const p of type.parts) {
        const errorTransform = findErrorTransform(types, p);
        if (errorTransform) return errorTransform;
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

function resolveJSType(types: CollectedTypes, type: ValidatorType): JSType {
  switch (type.kind) {
    case Kind.String: {
      return "string";
    }
    case Kind.Number: {
      return "number";
    }
    case Kind.Boolean: {
      return "boolean";
    }
    case Kind.Array: {
      return "array";
    }
    case Kind.Object: {
      return "object";
    }
    case Kind.Const: {
      if (typeof type.value === "string") {
        return "string";
      }
      if (typeof type.value === "number") {
        return "number";
      }
      if (typeof type.value === "boolean") {
        return "boolean";
      }
      return null;
    }
    case Kind.Ref: {
      const resolved = types.get(type.name);
      if (resolved) {
        return resolveJSType(types, resolved);
      }
      return null;
    }
    case Kind.Intersection: {
      return "object";
    }
    case Kind.Enum:
    case Kind.Union: {
      return null;
    }
    default: {
      const missing: never = type;
      throw new Error(`Unhandled kind: ${(missing as ValidatorType).kind}`);
    }
  }
}

function emitUnionCheck(
  gen: CodeGen,
  variants: ValidatorType[],
  accessor: string,
  path: string,
  ctx: string,
  validationMessage?: string,
  knownJSType?: JSType,
): void {
  const discriminator = findDiscriminator(gen.types, variants);
  if (discriminator) {
    emitDiscriminatedUnionCheck(
      gen,
      discriminator,
      accessor,
      path,
      ctx,
      validationMessage,
    );
    return;
  }

  if (
    emitTypeSplitUnion(gen, variants, accessor, path, ctx, validationMessage)
  ) {
    return;
  }

  emitTryEachUnion(
    gen,
    variants,
    accessor,
    path,
    ctx,
    validationMessage,
    knownJSType,
  );
}

function emitTypeSplitUnion(
  gen: CodeGen,
  variants: ValidatorType[],
  accessor: string,
  path: string,
  ctx: string,
  validationMessage?: string,
): boolean {
  const buckets = new Map<Exclude<JSType, null>, ValidatorType[]>();
  let hasUntyped = false;

  for (const variant of variants) {
    const jsType = resolveJSType(gen.types, variant);
    if (jsType === null) {
      hasUntyped = true;
    } else {
      let bucket = buckets.get(jsType);
      if (!bucket) {
        bucket = [];
        buckets.set(jsType, bucket);
      }
      bucket.push(variant);
    }
  }

  let elseBucket: ValidatorType[] | undefined;

  // If some variants have unknown JS type, fall back to splitting array vs non-array
  if (hasUntyped) {
    const arrayBucket: ValidatorType[] = [];
    const nonArrayBucket: ValidatorType[] = [];
    for (const variant of variants) {
      if (resolveJSType(gen.types, variant) === "array") {
        arrayBucket.push(variant);
      } else {
        nonArrayBucket.push(variant);
      }
    }
    buckets.clear();
    if (arrayBucket.length > 0 && nonArrayBucket.length > 0) {
      buckets.set("array", arrayBucket);
      elseBucket = nonArrayBucket;
    }
  }

  if (buckets.size < 2 && !elseBucket) {
    return false;
  }

  const description = validationMessage ?? describeUnion(gen.types, variants);
  let first = true;
  const trivialNegations: string[] = [];

  for (const [jsType, bucket] of buckets) {
    const condition =
      jsType === "array"
        ? `Array.isArray(${accessor})`
        : jsType === "object"
          ? `typeof ${accessor} === "object" && ${accessor} !== null`
          : `typeof ${accessor} === "${jsType}"`;

    if (
      bucket.length === 1 &&
      isTrivialForJSType(gen.types, bucket[0], jsType)
    ) {
      trivialNegations.push(`!(${condition})`);
      continue;
    }

    emit(gen, `${first ? "if" : "} else if"} (${condition}) {`);
    gen.indent++;
    emitBucket(
      gen,
      bucket,
      accessor,
      path,
      ctx,
      description,
      validationMessage,
      jsType,
    );
    gen.indent--;
    first = false;
  }

  const errorMsg = JSON.stringify(`expected ${description}`);

  if (first) {
    if (trivialNegations.length > 0) {
      emit(gen, `if (${trivialNegations.join(" && ")}) {`);
      gen.indent++;
      emitError(gen, `${ctx}.errors`, path, errorMsg, accessor);
      gen.indent--;
      emit(gen, `}`);
    }
    return true;
  }

  if (elseBucket) {
    emit(gen, `} else {`);
    gen.indent++;
    emitBucket(
      gen,
      elseBucket,
      accessor,
      path,
      ctx,
      description,
      validationMessage,
    );
    gen.indent--;
    emit(gen, `}`);
  } else {
    emit(
      gen,
      trivialNegations.length > 0
        ? `} else if (${trivialNegations.join(" && ")}) {`
        : `} else {`,
    );
    gen.indent++;
    emitError(gen, `${ctx}.errors`, path, errorMsg, accessor);
    gen.indent--;
    emit(gen, `}`);
  }
  return true;
}

function isShallowValidator(
  types: CollectedTypes,
  type: ValidatorType,
): boolean {
  switch (type.kind) {
    case Kind.String:
    case Kind.Number:
    case Kind.Boolean:
    case Kind.Const:
    case Kind.Enum: {
      return true;
    }
    case Kind.Ref: {
      const resolved = types.get(type.name);
      if (resolved) {
        return isShallowValidator(types, resolved);
      }
      return false;
    }
    case Kind.Union: {
      return type.variants.every((v) => isShallowValidator(types, v));
    }
    default: {
      return false;
    }
  }
}

function isTrivialForJSType(
  types: CollectedTypes,
  type: ValidatorType,
  jsType: JSType,
): boolean {
  switch (type.kind) {
    case Kind.Number: {
      return jsType === "number";
    }
    case Kind.Boolean: {
      return jsType === "boolean";
    }
    case Kind.String: {
      return jsType === "string" && !type.pattern;
    }
    case Kind.Ref: {
      const resolved = types.get(type.name);
      if (resolved) {
        return isTrivialForJSType(types, resolved, jsType);
      }
      return false;
    }
    default: {
      return false;
    }
  }
}

function emitCheckSkippingGuard(
  gen: CodeGen,
  type: ValidatorType,
  accessor: string,
  path: string,
  ctx: string,
  knownJSType?: JSType,
  unionDescription?: string,
): void {
  if (knownJSType === "array" && type.kind === Kind.Array) {
    emitArrayCheck(gen, type, accessor, path, ctx, true, unionDescription);
  } else if (knownJSType === "object" && type.kind === Kind.Object) {
    emitObjectCheck(gen, type, accessor, path, ctx, true);
  } else {
    emitCheck(gen, type, accessor, path, ctx);
  }
}

function emitWithTempCtx(
  gen: CodeGen,
  outerCtx: string,
  cb: (tempCtx: string) => void,
): string {
  const tempCtx = nextVar(gen);
  emit(
    gen,
    `const ${tempCtx}: ValidationContext = { errors: [], partial: ${outerCtx}.partial };`,
  );
  cb(tempCtx);
  return tempCtx;
}

function emitTransformCheck(
  gen: CodeGen,
  type: ValidatorType,
  errorTransform: string,
  container: string,
  key: string,
  path: string,
  ctx: string,
): void {
  const tempCtx = emitWithTempCtx(gen, ctx, (t) =>
    emitCheck(gen, type, `${container}[${key}]`, path, t),
  );
  emit(gen, `if (${tempCtx}.errors.length > 0 && ${ctx}.transform) {`);
  gen.indent++;
  const fixed = nextVar(gen);
  emit(
    gen,
    `const ${fixed} = ${ctx}.transform(${JSON.stringify(errorTransform)}, ${container}[${key}]);`,
  );
  emit(gen, `if (${fixed} !== undefined) ${container}[${key}] = ${fixed};`);
  emitCheck(gen, type, `${container}[${key}]`, path, ctx);
  gen.indent--;
  emit(gen, `} else {`);
  gen.indent++;
  emit(gen, `for (const _e of ${tempCtx}.errors) ${ctx}.errors.push(_e);`);
  gen.indent--;
  emit(gen, `}`);
}

function emitBucket(
  gen: CodeGen,
  bucket: ValidatorType[],
  accessor: string,
  path: string,
  ctx: string,
  description: string,
  validationMessage?: string,
  knownJSType?: JSType,
): void {
  const shallow = bucket.every((v) => isShallowValidator(gen.types, v));
  if (shallow) {
    const tempCtx = emitWithTempCtx(gen, ctx, (t) =>
      emitUnionCheck(gen, bucket, accessor, path, t, validationMessage),
    );
    emit(gen, `if (${tempCtx}.errors.length > 0) {`);
    gen.indent++;
    emitError(
      gen,
      `${ctx}.errors`,
      path,
      JSON.stringify(`expected ${description}`),
      accessor,
    );
    gen.indent--;
    emit(gen, `}`);
  } else if (bucket.length === 1) {
    emitCheckSkippingGuard(
      gen,
      bucket[0],
      accessor,
      path,
      ctx,
      knownJSType,
      description,
    );
  } else {
    emitUnionCheck(
      gen,
      bucket,
      accessor,
      path,
      ctx,
      validationMessage,
      knownJSType,
    );
  }
}

function emitTryMatchedFlag(
  gen: CodeGen,
  variants: ValidatorType[],
  accessor: string,
  path: string,
  ctx: string,
  knownJSType?: JSType,
): string {
  const matched = nextVar(gen);
  emit(gen, `let ${matched} = false;`);
  for (const variant of variants) {
    emit(gen, `if (!${matched}) {`);
    gen.indent++;
    const tempCtx = emitWithTempCtx(gen, ctx, (t) =>
      emitCheckSkippingGuard(gen, variant, accessor, path, t, knownJSType),
    );
    emit(gen, `if (${tempCtx}.errors.length === 0) ${matched} = true;`);
    gen.indent--;
    emit(gen, `}`);
  }
  return matched;
}

function emitTryEachUnion(
  gen: CodeGen,
  variants: ValidatorType[],
  accessor: string,
  path: string,
  ctx: string,
  validationMessage?: string,
  knownJSType?: JSType,
): void {
  const matched = emitTryMatchedFlag(
    gen,
    variants,
    accessor,
    path,
    ctx,
    knownJSType,
  );
  const description = validationMessage ?? describeUnion(gen.types, variants);
  emit(gen, `if (!${matched}) {`);
  gen.indent++;
  emitError(
    gen,
    `${ctx}.errors`,
    path,
    JSON.stringify(`expected ${description}`),
    accessor,
  );
  gen.indent--;
  emit(gen, `}`);
}

function collectFlatDescriptions(
  types: CollectedTypes,
  type: ValidatorType,
  out: Set<string>,
): void {
  const resolved =
    type.kind === Kind.Ref ? (types.get(type.name) ?? type) : type;
  if (resolved.kind === Kind.Union) {
    for (const v of resolved.variants) {
      collectFlatDescriptions(types, v, out);
    }
  } else {
    out.add(describeType(types, type));
  }
}

function describeItems(types: CollectedTypes, type: ValidatorType): string {
  const descriptions = new Set<string>();
  collectFlatDescriptions(types, type, descriptions);
  if (descriptions.size > 1) {
    return `(${[...descriptions].join(" | ")})`;
  }
  return descriptions.values().next().value as string;
}

function describeType(types: CollectedTypes, type: ValidatorType): string {
  if (type.validationMessage) {
    return type.validationMessage;
  }
  switch (type.kind) {
    case Kind.String: {
      if (type.pattern) {
        return `string matching ${type.pattern}`;
      }
      return "string";
    }
    case Kind.Number: {
      return "number";
    }
    case Kind.Boolean: {
      return "boolean";
    }
    case Kind.Const: {
      return JSON.stringify(type.value);
    }
    case Kind.Enum: {
      return type.values.map((v) => JSON.stringify(v)).join(" | ");
    }
    case Kind.Array: {
      const itemDesc = describeItems(types, type.items);
      if (type.minItems != null && type.minItems === type.maxItems) {
        return `${itemDesc}[${type.minItems}]`;
      }
      return `${itemDesc}[]`;
    }
    case Kind.Object: {
      for (const prop of type.properties) {
        if (
          prop.type.kind === Kind.Const &&
          typeof prop.type.value === "string"
        ) {
          return `{${prop.name}: ${JSON.stringify(prop.type.value)}}`;
        }
      }
      return "object";
    }
    case Kind.Union: {
      const descriptions = new Set<string>();
      for (const variant of type.variants) {
        collectFlatDescriptions(types, variant, descriptions);
      }
      if (descriptions.size === 2) {
        const [a, b] = descriptions;
        return `either ${a} or ${b}`;
      }
      return `one of: ${[...descriptions].join(", ")}`;
    }
    case Kind.Intersection: {
      const parts = type.parts.map((p) => describeType(types, p));
      const nonObject = parts.filter((p) => p !== "object");
      if (nonObject.length > 0) {
        return nonObject.join(" & ");
      }
      return "object";
    }
    case Kind.Ref: {
      const resolved = types.get(type.name);
      if (resolved) {
        const desc = describeType(types, resolved);
        if (desc === "object") {
          return type.name;
        }
        return desc;
      }
      return type.name;
    }
    default: {
      const missing: never = type;
      throw new Error(`Unhandled kind: ${(missing as ValidatorType).kind}`);
    }
  }
}

function describeUnion(
  types: CollectedTypes,
  variants: ValidatorType[],
): string {
  return describeType(types, { kind: Kind.Union, variants });
}

function findConstProperty(
  types: CollectedTypes,
  type: ValidatorType,
  name: string,
): unknown | undefined {
  switch (type.kind) {
    case Kind.Object: {
      for (const prop of type.properties) {
        if (prop.name === name && prop.type.kind === Kind.Const) {
          return prop.type.value;
        }
      }
      return undefined;
    }
    case Kind.Intersection: {
      for (const part of type.parts) {
        const val = findConstProperty(types, part, name);
        if (val !== undefined) {
          return val;
        }
      }
      return undefined;
    }
    case Kind.Ref: {
      const resolved = types.get(type.name);
      if (resolved) {
        return findConstProperty(types, resolved, name);
      }
      return undefined;
    }
    default: {
      return undefined;
    }
  }
}

type DiscriminatedUnion = {
  mapping: Map<string, ValidatorType>;
  rest: ValidatorType[];
};

function findDiscriminator(
  types: CollectedTypes,
  variants: ValidatorType[],
): DiscriminatedUnion | null {
  if (variants.length < 2) {
    return null;
  }

  const mapping = new Map<string, ValidatorType>();
  const rest: ValidatorType[] = [];
  let valid = true;
  for (const variant of variants) {
    const val = findConstProperty(types, variant, "type");
    if (val === undefined) {
      rest.push(variant);
      continue;
    }
    if (typeof val !== "string" || mapping.has(val)) {
      valid = false;
      break;
    }
    mapping.set(val, variant);
  }
  if (valid && mapping.size >= 2) {
    return { mapping, rest };
  }
  return null;
}

function emitDiscriminatedUnionCheck(
  gen: CodeGen,
  disc: DiscriminatedUnion,
  accessor: string,
  path: string,
  ctx: string,
  validationMessage?: string,
): void {
  const defaultMsg = JSON.stringify(
    "expected " +
      (validationMessage ??
        describeUnion(
          gen.types,
          [...disc.mapping.keys()].map((v) => ({
            kind: Kind.Const as const,
            value: v,
          })),
        )),
  );

  const notObjectMsg =
    disc.rest.length > 0
      ? JSON.stringify(
          "expected " +
            (validationMessage ??
              describeUnion(gen.types, [
                ...disc.rest,
                ...disc.mapping.values(),
              ])),
        )
      : defaultMsg;

  let matched: string | undefined;
  if (disc.rest.length > 0) {
    matched = emitTryMatchedFlag(gen, disc.rest, accessor, path, ctx);
    emit(gen, `if (!${matched}) {`);
    gen.indent++;
  }

  const obj = nextVar(gen);
  emit(gen, `if (typeof ${accessor} !== "object" || ${accessor} === null) {`);
  gen.indent++;
  emitError(gen, `${ctx}.errors`, path, notObjectMsg, accessor);
  gen.indent--;
  emit(gen, `} else {`);
  gen.indent++;
  emit(gen, `const ${obj} = ${accessor} as Record<string, unknown>;`);
  emit(gen, `switch (${obj}["type"]) {`);
  gen.indent++;

  for (const [value, variant] of disc.mapping) {
    emit(gen, `case ${JSON.stringify(value)}:`);
    gen.indent++;
    emitCheck(gen, variant, accessor, path, ctx);
    emit(gen, `break;`);
    gen.indent--;
  }

  emit(gen, `default:`);
  gen.indent++;
  emitError(
    gen,
    `${ctx}.errors`,
    `${path} + "/type"`,
    defaultMsg,
    `${obj}["type"]`,
  );
  gen.indent--;
  gen.indent--;
  emit(gen, `}`);
  gen.indent--;
  emit(gen, `}`);

  if (matched) {
    gen.indent--;
    emit(gen, `}`);
  }
}

function emitArrayCheck(
  gen: CodeGen,
  type: Extract<ValidatorType, { kind: Kind.Array }>,
  accessor: string,
  path: string,
  ctx: string,
  skipArrayGuard = false,
  unionDescription?: string,
): void {
  const errors = `${ctx}.errors`;
  const isFixedLength =
    type.minItems != null && type.minItems === type.maxItems;
  const desc = describeType(gen.types, type);
  const notArrayDesc = unionDescription ?? (isFixedLength ? desc : "array");
  const wrongLengthDesc = unionDescription ?? desc;
  if (!skipArrayGuard) {
    emit(gen, `if (!Array.isArray(${accessor})) {`);
    gen.indent++;
    emitError(
      gen,
      errors,
      path,
      JSON.stringify(`expected ${notArrayDesc}`),
      accessor,
    );
    gen.indent--;
    emit(gen, `} else {`);
    gen.indent++;
  }
  if (isFixedLength) {
    emit(gen, `if (${accessor}.length !== ${type.minItems}) {`);
    gen.indent++;
    emitError(
      gen,
      errors,
      path,
      JSON.stringify(`expected ${wrongLengthDesc}`),
      accessor,
    );
    gen.indent--;
    emit(gen, `} else {`);
    gen.indent++;
  } else {
    if (type.minItems != null) {
      emit(gen, `if (${accessor}.length < ${type.minItems}) {`);
      gen.indent++;
      emitError(
        gen,
        errors,
        path,
        `"expected at least ${type.minItems} items"`,
        `${accessor}.length`,
      );
      gen.indent--;
      emit(gen, `}`);
    }
    if (type.maxItems != null) {
      emit(gen, `if (${accessor}.length > ${type.maxItems}) {`);
      gen.indent++;
      emitError(
        gen,
        errors,
        path,
        `"expected at most ${type.maxItems} items"`,
        `${accessor}.length`,
      );
      gen.indent--;
      emit(gen, `}`);
    }
  }
  const idx = nextVar(gen);
  emit(gen, `for (let ${idx} = 0; ${idx} < ${accessor}.length; ${idx}++) {`);
  gen.indent++;
  const itemsErrorTransform = findErrorTransform(gen.types, type.items);
  if (itemsErrorTransform) {
    emitTransformCheck(
      gen,
      type.items,
      itemsErrorTransform,
      accessor,
      idx,
      `${path} + "/" + ${idx}`,
      ctx,
    );
  } else {
    emitCheck(
      gen,
      type.items,
      `${accessor}[${idx}]`,
      `${path} + "/" + ${idx}`,
      ctx,
    );
  }
  gen.indent--;
  emit(gen, `}`);
  if (isFixedLength) {
    gen.indent--;
    emit(gen, `}`);
  }

  if (!skipArrayGuard) {
    gen.indent--;
    emit(gen, `}`);
  }
}

function collectKnownPropertyNames(
  types: CollectedTypes,
  type: ValidatorType,
  out: Set<string>,
): void {
  switch (type.kind) {
    case Kind.Object: {
      for (const prop of type.properties) {
        out.add(prop.name);
      }
      break;
    }
    case Kind.Intersection: {
      for (const part of type.parts) {
        collectKnownPropertyNames(types, part, out);
      }
      break;
    }
    case Kind.Ref: {
      const resolved = types.get(type.name);
      if (resolved) {
        collectKnownPropertyNames(types, resolved, out);
      }
      break;
    }
  }
}

function emitObjectCheck(
  gen: CodeGen,
  type: Extract<ValidatorType, { kind: Kind.Object }>,
  accessor: string,
  path: string,
  ctx: string,
  skipObjectGuard = false,
  parentType?: ValidatorType,
): void {
  const errors = `${ctx}.errors`;
  if (!skipObjectGuard) {
    emit(gen, `if (typeof ${accessor} !== "object" || ${accessor} === null) {`);
    gen.indent++;
    emitError(gen, errors, path, `"expected object"`, accessor);
    gen.indent--;
    emit(gen, `} else {`);
    gen.indent++;
  }

  const obj = nextVar(gen);
  emit(gen, `const ${obj} = ${accessor} as Record<string, unknown>;`);

  for (const prop of type.properties) {
    if (prop.required) {
      emit(gen, `if (!${ctx}.partial && !("${prop.name}" in ${obj})) {`);
      gen.indent++;
      emitError(
        gen,
        errors,
        `${path} + "/${prop.name}"`,
        `"missing required property"`,
        accessor,
      );
      gen.indent--;
      emit(gen, `} else if (${obj}["${prop.name}"] !== undefined) {`);
    } else {
      emit(gen, `if (${obj}["${prop.name}"] !== undefined) {`);
    }

    gen.indent++;
    const propErrorTransform = findErrorTransform(gen.types, prop.type);
    if (propErrorTransform) {
      emitTransformCheck(
        gen,
        prop.type,
        propErrorTransform,
        obj,
        JSON.stringify(prop.name),
        `${path} + "/${prop.name}"`,
        ctx,
      );
    } else {
      emitCheck(
        gen,
        prop.type,
        `${obj}["${prop.name}"]`,
        `${path} + "/${prop.name}"`,
        ctx,
      );
    }
    gen.indent--;
    emit(gen, `}`);
  }

  if (type.patternProperties) {
    const key = nextVar(gen);
    emit(gen, `for (const ${key} of Object.keys(${obj})) {`);
    gen.indent++;
    for (const pp of type.patternProperties) {
      emit(gen, `if (${getOrCreateRegexp(gen, pp.pattern)}.test(${key})) {`);
      gen.indent++;
      emitCheck(gen, pp.type, `${obj}[${key}]`, `${path} + "/" + ${key}`, ctx);
      gen.indent--;
      emit(gen, `}`);
    }
    gen.indent--;
    emit(gen, `}`);
  }

  if (
    type.propertyNames ||
    (type.additionalProperties !== undefined &&
      type.additionalProperties !== true)
  ) {
    const key = nextVar(gen);
    emit(gen, `for (const ${key} of Object.keys(${obj})) {`);
    gen.indent++;

    if (type.propertyNames) {
      emitCheck(gen, type.propertyNames, key, `${path} + "/" + ${key}`, ctx);
    }

    if (
      type.additionalProperties !== undefined &&
      type.additionalProperties !== true
    ) {
      const knownNames = new Set<string>();
      collectKnownPropertyNames(gen.types, type, knownNames);
      if (parentType) {
        collectKnownPropertyNames(gen.types, parentType, knownNames);
      }
      if (knownNames.size > 0) {
        const checks = [...knownNames]
          .map((n) => `${key} !== ${JSON.stringify(n)}`)
          .join(" && ");
        emit(gen, `if (${checks}) {`);
        gen.indent++;
      }

      if (type.additionalProperties === false) {
        emitError(
          gen,
          errors,
          `${path} + "/" + ${key}`,
          `"unexpected property"`,
          key,
        );
      } else {
        emitCheck(
          gen,
          type.additionalProperties,
          `${obj}[${key}]`,
          `${path} + "/" + ${key}`,
          ctx,
        );
      }

      if (knownNames.size > 0) {
        gen.indent--;
        emit(gen, `}`);
      }
    }

    gen.indent--;
    emit(gen, `}`);
  }

  if (!skipObjectGuard) {
    gen.indent--;
    emit(gen, `}`);
  }
}
