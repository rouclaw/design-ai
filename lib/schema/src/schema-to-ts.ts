export type Config = "public" | "private";

export interface JSONSchema {
  _PRIVATE?: boolean;
  $schema?: string;
  title?: string;
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  $ref?: string;
  $defs?: Record<string, JSONSchema>;
  enum?: unknown[];
  const?: unknown;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  propertyNames?: JSONSchema;
  additionalProperties?: boolean | JSONSchema;
  patternProperties?: Record<string, JSONSchema>;
  unevaluatedProperties?: boolean;
  $id?: string;
  description?: string;
  _validationMessage?: string;
  _errorTransform?: string;
}

export class JSONSchemaToTypeScript {
  private generatedTypes = new Set<string>();
  private typeDefinitions: string[] = [];
  private rootSchema: JSONSchema;
  private config: Config;

  constructor(schema: JSONSchema, config: Config) {
    this.rootSchema = schema;
    this.config = config;
  }

  convert(rootName: string): string {
    this.typeDefinitions = [];
    this.generatedTypes.clear();

    // Generate types from $defs first
    if (this.rootSchema.$defs) {
      for (const [defName, defSchema] of Object.entries(
        this.rootSchema.$defs,
      )) {
        this.processDefinition(defName, defSchema);
      }
    }

    this.processDefinition(rootName, this.rootSchema);

    return this.typeDefinitions.join("\n\n");
  }

  private processDefinition(name: string, schema: JSONSchema): void {
    if (schema._PRIVATE && this.config !== "private") {
      return;
    }
    const typeName = this.capitalizeFirst(name);
    if (this.generatedTypes.has(typeName)) return;

    this.generatedTypes.add(typeName);

    // Special handling for simple types that should be type aliases
    if (schema.type === "string" && (schema.pattern || schema.description)) {
      const comment = schema.description
        ? `/** ${schema.description} */\n`
        : "";
      this.typeDefinitions.push(`${comment}export type ${typeName} = string;`);
      return;
    }

    const typeDefinition = this.generateTypeDefinition(typeName, schema);
    if (typeDefinition) {
      this.typeDefinitions.push(typeDefinition);
    }
  }

  private generateTypeDefinition(
    typeName: string,
    schema: JSONSchema,
  ): string | null {
    if (schema.enum) {
      return this.generateEnum(typeName, schema.enum);
    }

    if (schema.oneOf) {
      return this.generateUnion(typeName, schema.oneOf);
    }

    if (
      schema.type === "object" ||
      schema.properties ||
      schema.allOf ||
      schema.required
    ) {
      return this.generateInterface(typeName, schema);
    }

    // For simple types that don't need their own definition
    return null;
  }

  private generateInterface(typeName: string, schema: JSONSchema): string {
    const extendsTypes: string[] = [];
    const properties: string[] = [];

    // Handle allOf composition
    if (schema.allOf) {
      for (const subSchema of schema.allOf) {
        if (subSchema.$ref) {
          const refType = this.resolveRef(subSchema.$ref);
          extendsTypes.push(refType);
        } else if (subSchema.properties) {
          properties.push(...this.extractProperties(subSchema));
        }
      }
    }

    // Handle direct properties
    if (schema.properties) {
      properties.push(...this.extractProperties(schema));
    }

    // Handle top-level $ref
    if (schema.$ref) {
      const found = this.findRef(schema.$ref);
      if (!found) {
        throw new Error(
          `Unsupported reference value in top level $ref "${schema.$ref}"`,
        );
      }

      properties.push(...this.extractProperties(found.refSchema));
    }

    if (schema.additionalProperties) {
      const keyComment = schema.propertyNames?.description
        ? ` /** ${schema.propertyNames.description} */`
        : "";
      const comment =
        typeof schema.additionalProperties === "object" &&
        schema.additionalProperties.description
          ? ` /** ${schema.additionalProperties.description} */`
          : "";
      properties.push(
        `[key: string${keyComment}]: ${schema.additionalProperties === true ? "any" : this.generateType(schema.additionalProperties)}${comment}`,
      );
    }

    const comment = schema.description ? `/** ${schema.description} */\n` : "";
    const extendsClause =
      extendsTypes.length > 0 ? ` extends ${extendsTypes.join(", ")}` : "";
    let interfaceStr = `${comment}export interface ${typeName}${extendsClause} {`;

    if (properties.length > 0) {
      interfaceStr += `\n${properties.join("\n")}\n`;
    }

    interfaceStr += "}";
    return interfaceStr;
  }

  findRef(
    reference: string,
  ): { defName: string; refSchema: JSONSchema } | null {
    if (reference.startsWith("#/$defs/")) {
      const defName = reference.replace("#/$defs/", "");

      const refSchema = this.rootSchema.$defs?.[defName];
      if (!refSchema) {
        throw new Error(`Unknown schema in reference "${reference}"`);
      }

      return { defName, refSchema };
    }

    return null;
  }

  private extractProperties(schema: JSONSchema): string[] {
    const properties: string[] = [];
    const required = schema.required || [];

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propSchema._PRIVATE && this.config !== "private") {
          continue;
        }
        const isRequired = required.includes(propName);
        const optional = isRequired ? "" : "?";
        const propType = this.generateType(propSchema);

        const comment = propSchema.description
          ? `  /** ${propSchema.description} */\n`
          : "";
        properties.push(`${comment}  ${propName}${optional}: ${propType};`);
      }
    }

    return properties;
  }

  private generateEnum(typeName: string, enums: unknown[]): string {
    const enumValues = enums
      .map((value) => {
        switch (typeof value) {
          case "string":
            return `'${value}'`;
          case "number":
          case "boolean":
            return `${value}`;
          default:
            throw new Error(`Unsupported enum value: ${JSON.stringify(value)}`);
        }
      })
      .join(" | ");

    return `export type ${typeName} = ${enumValues};`;
  }

  private generateUnion(typeName: string, oneOf: JSONSchema[]): string {
    const unionTypes = oneOf
      .map((subSchema) => {
        if (subSchema._PRIVATE && this.config !== "private") {
          return undefined;
        }
        const comment = subSchema.description
          ? `\n/** ${subSchema.description} */\n`
          : "";
        return `${comment}${this.generateType(subSchema)}`;
      })
      .filter((type) => type !== undefined);
    return `export type ${typeName} = ${unionTypes.join(" | ")};`;
  }

  private generateType(schema: JSONSchema, fallbackName?: string): string {
    // Handle references
    if (schema.$ref) {
      return this.resolveRef(schema.$ref);
    }

    // Handle const values
    if (schema.const !== undefined) {
      return JSON.stringify(schema.const);
    }

    // Handle string patterns (like color)
    if (schema.type === "string" && schema.pattern) {
      return "string"; // Could be more specific based on pattern
    }

    // Handle enums
    if (schema.enum) {
      if (fallbackName && !this.generatedTypes.has(fallbackName)) {
        this.processDefinition(fallbackName.toLowerCase(), schema);
        return fallbackName;
      }
      return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
    }

    // Handle oneOf unions
    if (schema.oneOf) {
      return schema.oneOf
        .map((subSchema) => {
          if (subSchema._PRIVATE && this.config !== "private") {
            return "";
          }
          const comment = subSchema.description
            ? ` /** ${subSchema.description} */`
            : "";
          return `|${comment} ${this.generateType(subSchema)}`;
        })
        .join("\n");
    }

    // Handle anyOf unions
    if (schema.anyOf) {
      return schema.anyOf
        .map((subSchema) => this.generateType(subSchema))
        .join(" | ");
    }

    // Handle allOf intersections
    if (schema.allOf) {
      const types: string[] = [];
      for (const subSchema of schema.allOf) {
        if (subSchema.$ref) {
          types.push(this.resolveRef(subSchema.$ref));
        } else {
          const type = this.generateType(subSchema);
          if (type !== "{}") {
            types.push(type);
          }
        }
      }
      return types.length > 0 ? types.join(" & ") : "{}";
    }

    // Handle arrays
    if (schema.type === "array" && schema.items) {
      const itemType = this.generateType(schema.items);
      if (
        schema.minItems !== undefined &&
        schema.minItems === schema.maxItems
      ) {
        const elements = Array(schema.minItems).fill(itemType).join(", ");
        return `[${elements}]`;
      }
      // Handle arrays in oneOf properly
      if (itemType.includes("|")) {
        return `(${itemType})[]`;
      }
      return `${itemType}[]`;
    }

    // Handle objects
    if (schema.type === "object" || schema.properties) {
      if (fallbackName && !this.generatedTypes.has(fallbackName)) {
        this.processDefinition(fallbackName.toLowerCase(), schema);
        return fallbackName;
      }

      // Inline object type
      const properties: string[] = [];
      const required = schema.required || [];
      let hasComments = false;

      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(
          schema.properties,
        )) {
          const isRequired = required.includes(propName);
          const optional = isRequired ? "" : "?";
          const propType = this.generateType(propSchema);
          if (propSchema.description) {
            hasComments = true;
            properties.push(
              `/** ${propSchema.description} */\n${propName}${optional}: ${propType}`,
            );
          } else {
            properties.push(`${propName}${optional}: ${propType}`);
          }
        }
      }

      if (schema.additionalProperties) {
        const keyComment = schema.propertyNames?.description
          ? ` /** ${schema.propertyNames.description} */`
          : "";
        const comment =
          typeof schema.additionalProperties === "object" &&
          schema.additionalProperties.description
            ? ` /** ${schema.additionalProperties.description} */`
            : "";
        properties.push(
          `[key: string${keyComment}]: ${schema.additionalProperties === true ? "any" : this.generateType(schema.additionalProperties)}${comment}`,
        );
      }

      if (schema.patternProperties) {
        for (const [pattern, propertiesSchema] of Object.entries(
          schema.patternProperties,
        )) {
          properties.push(
            `[key: string /** RegEx: ${pattern} */]: ${this.generateType(propertiesSchema)}`,
          );
        }
      }

      if (properties.length === 0) {
        return "{}";
      }

      if (hasComments) {
        return `{\n${properties.join(";\n")};\n}`;
      }

      return `{ ${properties.join("; ")} }`;
    }

    // Handle primitive types
    switch (schema.type) {
      case "string":
        return "string";
      case "number":
        return "number";
      case "integer":
        return "number";
      case "boolean":
        return "boolean";
      case "null":
        return "null";
      default:
        if (Array.isArray(schema.type)) {
          return schema.type
            .map((t) => {
              switch (t) {
                case "string":
                  return "string";
                case "number":
                  return "number";
                case "integer":
                  return "number";
                case "boolean":
                  return "boolean";
                case "null":
                  return "null";
                default:
                  return "any";
              }
            })
            .join(" | ");
        }
        return "any";
    }
  }

  private resolveRef(ref: string): string {
    const found = this.findRef(ref);
    if (!found) {
      throw new Error(`Unknown references "${ref}"`);
    }

    const typeName = this.capitalizeFirst(found.defName);

    this.processDefinition(found.defName, found.refSchema);

    return typeName;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Utility function to convert a JSON schema to TypeScript
export function convertJSONSchemaToTypeScript(
  schema: JSONSchema,
  rootName: string,
  config: Config,
): string {
  const converter = new JSONSchemaToTypeScript(schema, config);
  return converter.convert(rootName);
}
