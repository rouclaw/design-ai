import {
  type ValidationContext,
  validate_document,
} from "./generated-validator";

function test(name: string, input: unknown, expected: string[]) {
  const ctx: ValidationContext = { errors: [], partial: false };
  validate_document(input, ctx, "");
  const messages = ctx.errors.map((e) => `${e.path}: ${e.message}`);

  let pass = true;
  if (messages.length !== expected.length) {
    pass = false;
  } else {
    for (let i = 0; i < messages.length; i++) {
      if (messages[i] !== expected[i]) {
        pass = false;
        break;
      }
    }
  }

  if (!pass) {
    console.log(`FAIL: ${name}`);
    console.log("  expected:", expected);
    console.log("  got:     ", messages);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${name}`);
  }
}

function testTransform(
  name: string,
  input: unknown,
  transform: (tag: string, value: unknown) => unknown,
  expectedErrors: string[],
  checkMutation?: (input: unknown) => void,
) {
  const ctx: ValidationContext = { errors: [], partial: false, transform };
  validate_document(input, ctx, "");
  const messages = ctx.errors.map((e) => `${e.path}: ${e.message}`);

  let pass = true;
  if (messages.length !== expectedErrors.length) {
    pass = false;
  } else {
    for (let i = 0; i < messages.length; i++) {
      if (messages[i] !== expectedErrors[i]) {
        pass = false;
        break;
      }
    }
  }

  if (pass && checkMutation) {
    try {
      checkMutation(input);
    } catch (e) {
      pass = false;
      console.log(`FAIL: ${name} (mutation check: ${e})`);
      process.exitCode = 1;
      return;
    }
  }

  if (!pass) {
    console.log(`FAIL: ${name}`);
    console.log("  expected errors:", expectedErrors);
    console.log("  got errors:     ", messages);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${name}`);
  }
}

const base = { version: "1.0", children: [] as unknown[] };
function doc(...children: unknown[]) {
  return { ...base, children };
}
function rect(props: Record<string, unknown>) {
  return { id: "r1", type: "rectangle", ...props };
}
function frame(props: Record<string, unknown>) {
  return { id: "f1", type: "frame", ...props };
}
function text(props: Record<string, unknown>) {
  return { id: "t1", type: "text", content: "hello", ...props };
}
function ellipse(props: Record<string, unknown>) {
  return { id: "e1", type: "ellipse", ...props };
}
function line(props: Record<string, unknown>) {
  return { id: "l1", type: "line", ...props };
}
function polygon(props: Record<string, unknown>) {
  return { id: "p1", type: "polygon", ...props };
}
function path(props: Record<string, unknown>) {
  return { id: "pa1", type: "path", ...props };
}
function group(props: Record<string, unknown>) {
  return { id: "g1", type: "group", ...props };
}
function connection(props: Record<string, unknown>) {
  return { id: "cn1", type: "connection", ...props };
}
function note(props: Record<string, unknown>) {
  return { id: "n1", type: "note", ...props };
}
function prompt(props: Record<string, unknown>) {
  return { id: "pr1", type: "prompt", ...props };
}
function context(props: Record<string, unknown>) {
  return { id: "ctx1", type: "context", ...props };
}
function iconFont(props: Record<string, unknown>) {
  return { id: "if1", type: "icon_font", ...props };
}

// --- fill: discriminated union with rest variants ---

test("fill: valid hex color #rrggbb", doc(rect({ fill: "#ff0000" })), []);
test("fill: valid hex color #rgb", doc(rect({ fill: "#f00" })), []);
test("fill: valid hex color #rrggbbaa", doc(rect({ fill: "#ff000080" })), []);
test("fill: valid variable ref", doc(rect({ fill: "$myColor" })), []);
test(
  "fill: valid color object",
  doc(rect({ fill: { type: "color", color: "#ff0000" } })),
  [],
);
test(
  "fill: valid gradient object",
  doc(rect({ fill: { type: "gradient" } })),
  [],
);
test(
  "fill: valid image object",
  doc(rect({ fill: { type: "image", url: "https://example.com/img.png" } })),
  [],
);
test(
  "fill: valid mesh_gradient object",
  doc(rect({ fill: { type: "mesh_gradient" } })),
  [],
);

test("fill: invalid string shows all types", doc(rect({ fill: "abc" })), [
  '/children/0/fill: expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), "$variable", {type: "color"}, {type: "gradient"}, {type: "image"}, {type: "mesh_gradient"}, got "abc"',
]);
test("fill: invalid number shows all types", doc(rect({ fill: 123 })), [
  '/children/0/fill: expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), "$variable", {type: "color"}, {type: "gradient"}, {type: "image"}, {type: "mesh_gradient"}, got 123',
]);
test("fill: null shows all types", doc(rect({ fill: null })), [
  '/children/0/fill: expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), "$variable", {type: "color"}, {type: "gradient"}, {type: "image"}, {type: "mesh_gradient"}, got null',
]);
test("fill: boolean shows all types", doc(rect({ fill: true })), [
  '/children/0/fill: expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), "$variable", {type: "color"}, {type: "gradient"}, {type: "image"}, {type: "mesh_gradient"}, got true',
]);
test("fill: invalid type discriminator", doc(rect({ fill: { type: "abc" } })), [
  '/children/0/fill/type: expected one of: "color", "gradient", "image", "mesh_gradient", got "abc"',
]);
test("fill: missing type on object", doc(rect({ fill: { color: "#fff" } })), [
  '/children/0/fill/type: expected one of: "color", "gradient", "image", "mesh_gradient", got undefined',
]);
test(
  "fill: gradient with invalid gradientType",
  doc(rect({ fill: { type: "gradient", gradientType: "invalid" } })),
  [
    '/children/0/fill/gradientType: expected one of: "linear", "radial", "angular", got "invalid"',
  ],
);
test(
  "fill: gradient with valid gradientType",
  doc(rect({ fill: { type: "gradient", gradientType: "linear" } })),
  [],
);
test(
  "fill: gradient with valid gradientType radial",
  doc(rect({ fill: { type: "gradient", gradientType: "radial" } })),
  [],
);
test(
  "fill: color object missing required color",
  doc(rect({ fill: { type: "color" } })),
  ['/children/0/fill/color: missing required property, got {"type":"color"}'],
);
test(
  "fill: color object with invalid color value",
  doc(rect({ fill: { type: "color", color: 123 } })),
  [
    '/children/0/fill/color: expected either color hex string (#RRGGBBAA, #RRGGBB or #RGB) or "$variable", got 123',
  ],
);
test(
  "fill: color object with invalid hex",
  doc(rect({ fill: { type: "color", color: "#xyz" } })),
  [
    '/children/0/fill/color: expected either color hex string (#RRGGBBAA, #RRGGBB or #RGB) or "$variable", got "#xyz"',
  ],
);
test(
  "fill: color object with variable color",
  doc(rect({ fill: { type: "color", color: "$c" } })),
  [],
);
test("fill: invalid hex 4 chars", doc(rect({ fill: "#ffff" })), [
  '/children/0/fill: expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), "$variable", {type: "color"}, {type: "gradient"}, {type: "image"}, {type: "mesh_gradient"}, got "#ffff"',
]);

// --- fills: single or array ---

test(
  "fills: valid array of fills",
  doc(rect({ fill: ["#ff0000", { type: "gradient" }] })),
  [],
);
test("fills: valid array of single fill", doc(rect({ fill: ["#ff0000"] })), []);
test("fills: empty array", doc(rect({ fill: [] })), []);
test("fills: array with invalid element", doc(rect({ fill: [123] })), [
  '/children/0/fill/0: expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), "$variable", {type: "color"}, {type: "gradient"}, {type: "image"}, {type: "mesh_gradient"}, got 123',
]);
test("fills: array with multiple invalid", doc(rect({ fill: [123, "bad"] })), [
  '/children/0/fill/0: expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), "$variable", {type: "color"}, {type: "gradient"}, {type: "image"}, {type: "mesh_gradient"}, got 123',
  '/children/0/fill/1: expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), "$variable", {type: "color"}, {type: "gradient"}, {type: "image"}, {type: "mesh_gradient"}, got "bad"',
]);
test(
  "fills: array with invalid type in object",
  doc(rect({ fill: [{ type: "bad" }] })),
  [
    '/children/0/fill/0/type: expected one of: "color", "gradient", "image", "mesh_gradient", got "bad"',
  ],
);

// --- effect: discriminated union, no rest ---

test(
  "effect: valid blur",
  doc(rect({ effect: { type: "blur", radius: 5 } })),
  [],
);
test(
  "effect: valid background_blur",
  doc(rect({ effect: { type: "background_blur", radius: 10 } })),
  [],
);
test(
  "effect: valid shadow minimal",
  doc(rect({ effect: { type: "shadow", offset: { x: 0, y: 0 } } })),
  [],
);
test("effect: invalid type", doc(rect({ effect: { type: "invalid" } })), [
  '/children/0/effect/type: expected one of: "blur", "background_blur", "shadow", got "invalid"',
]);
test(
  "effect: shadow invalid shadowType",
  doc(
    rect({
      effect: { type: "shadow", offset: { x: 0, y: 0 }, shadowType: "invalid" },
    }),
  ),
  [
    '/children/0/effect/shadowType: expected one of: "inner", "outer", got "invalid"',
  ],
);
test(
  "effect: shadow valid inner",
  doc(
    rect({
      effect: { type: "shadow", offset: { x: 0, y: 0 }, shadowType: "inner" },
    }),
  ),
  [],
);
test(
  "effect: shadow valid outer",
  doc(
    rect({
      effect: { type: "shadow", offset: { x: 0, y: 0 }, shadowType: "outer" },
    }),
  ),
  [],
);
test("effect: not an object", doc(rect({ effect: "abc" })), [
  '/children/0/effect: expected one of: "blur", "background_blur", "shadow", got "abc"',
]);
test("effect: number", doc(rect({ effect: 42 })), [
  '/children/0/effect: expected one of: "blur", "background_blur", "shadow", got 42',
]);
test("effect: null", doc(rect({ effect: null })), [
  '/children/0/effect: expected one of: "blur", "background_blur", "shadow", got null',
]);
test(
  "effect: blur with variable radius",
  doc(rect({ effect: { type: "blur", radius: "$r" } })),
  [],
);
test(
  "effect: blur with invalid radius",
  doc(rect({ effect: { type: "blur", radius: "abc" } })),
  [
    '/children/0/effect/radius: expected either number or "$variable", got "abc"',
  ],
);
test(
  "effect: shadow with invalid offset",
  doc(rect({ effect: { type: "shadow", offset: "bad" } })),
  ['/children/0/effect/offset: expected object, got "bad"'],
);
test(
  "effect: shadow with invalid blendMode",
  doc(
    rect({
      effect: { type: "shadow", offset: { x: 0, y: 0 }, blendMode: "bad" },
    }),
  ),
  [
    '/children/0/effect/blendMode: expected one of: "normal", "darken", "multiply", "linearBurn", "colorBurn", "light", "screen", "linearDodge", "colorDodge", "overlay", "softLight", "hardLight", "difference", "exclusion", "hue", "saturation", "color", "luminosity", got "bad"',
  ],
);

// --- effects: single or array ---

test("effects: single effect", doc(rect({ effect: { type: "blur" } })), []);
test(
  "effects: array of effects",
  doc(rect({ effect: [{ type: "blur" }, { type: "background_blur" }] })),
  [],
);
test(
  "effects: array with invalid type",
  doc(rect({ effect: [{ type: "blur" }, { type: "bad" }] })),
  [
    '/children/0/effect/1/type: expected one of: "blur", "background_blur", "shadow", got "bad"',
  ],
);
test("effects: empty array", doc(rect({ effect: [] })), []);

// --- numberOrVariable ---

test("numberOrVariable: valid number", doc(rect({ width: 100 })), []);
test("numberOrVariable: valid zero", doc(rect({ width: 0 })), []);
test("numberOrVariable: valid negative", doc(rect({ width: -10 })), []);
test("numberOrVariable: valid float", doc(rect({ width: 3.14 })), []);
test("numberOrVariable: valid variable", doc(rect({ width: "$myWidth" })), []);
test("numberOrVariable: invalid string", doc(rect({ width: "abc" })), [
  '/children/0/width: expected one of: number, "$variable", sizing behavior (fit_content or fill_container, with optional fallback size like fit_content(100)), got "abc"',
]);
test("numberOrVariable: invalid boolean", doc(rect({ opacity: true })), [
  '/children/0/opacity: expected either number or "$variable", got true',
]);
test("numberOrVariable: invalid null", doc(rect({ opacity: null })), [
  '/children/0/opacity: expected either number or "$variable", got null',
]);

// --- sizingBehavior ---

test("size: valid fit_content", doc(rect({ width: "fit_content" })), []);
test("size: valid fill_container", doc(rect({ width: "fill_container" })), []);
test(
  "size: valid fit_content with fallback",
  doc(rect({ width: "fit_content(100)" })),
  [],
);
test(
  "size: valid fill_container with fallback",
  doc(rect({ width: "fill_container(200)" })),
  [],
);
test(
  "size: valid fill_container with float fallback",
  doc(rect({ width: "fill_container(3.5)" })),
  [],
);
test(
  "size: valid fill_container with negative fallback",
  doc(rect({ width: "fill_container(-10)" })),
  [],
);
test("size: invalid sizing string", doc(rect({ width: "stretch" })), [
  '/children/0/width: expected one of: number, "$variable", sizing behavior (fit_content or fill_container, with optional fallback size like fit_content(100)), got "stretch"',
]);
test("size: height valid", doc(rect({ height: "fit_content(50)" })), []);
test("size: height invalid", doc(rect({ height: "auto" })), [
  '/children/0/height: expected one of: number, "$variable", sizing behavior (fit_content or fill_container, with optional fallback size like fit_content(100)), got "auto"',
]);

// --- padding: number, [2], or [4] ---

test(
  "padding: valid number",
  doc(frame({ layout: "vertical", padding: 10 })),
  [],
);
test("padding: valid zero", doc(frame({ layout: "vertical", padding: 0 })), []);
test(
  "padding: valid variable",
  doc(frame({ layout: "vertical", padding: "$p" })),
  [],
);
test(
  "padding: valid [h, v]",
  doc(frame({ layout: "vertical", padding: [10, 20] })),
  [],
);
test(
  "padding: valid [h, v] with variables",
  doc(frame({ layout: "vertical", padding: ["$h", "$v"] })),
  [],
);
test(
  "padding: valid [t, r, b, l]",
  doc(frame({ layout: "vertical", padding: [10, 20, 30, 40] })),
  [],
);
test(
  "padding: valid [t, r, b, l] mixed",
  doc(frame({ layout: "vertical", padding: [10, "$r", 30, "$l"] })),
  [],
);
test(
  "padding: invalid array length 1",
  doc(frame({ layout: "vertical", padding: [10] })),
  [
    "/children/0/padding: expected number, [horizontal, vertical], or [top, right, bottom, left], each value can be a number or variable, got [10]",
  ],
);
test(
  "padding: invalid array length 3",
  doc(frame({ layout: "vertical", padding: [10, 20, 30] })),
  [
    "/children/0/padding: expected number, [horizontal, vertical], or [top, right, bottom, left], each value can be a number or variable, got [10,20,30]",
  ],
);
test(
  "padding: invalid array length 5",
  doc(frame({ layout: "vertical", padding: [1, 2, 3, 4, 5] })),
  [
    "/children/0/padding: expected number, [horizontal, vertical], or [top, right, bottom, left], each value can be a number or variable, got [1,2,3,4,5]",
  ],
);
test(
  "padding: invalid string",
  doc(frame({ layout: "vertical", padding: "abc" })),
  [
    '/children/0/padding: expected number, [horizontal, vertical], or [top, right, bottom, left], each value can be a number or variable, got "abc"',
  ],
);

// --- textContent: string or styled spans array ---

test(
  "textContent: valid plain string",
  doc(text({ content: "hello world" })),
  [],
);
test("textContent: valid empty string", doc(text({ content: "" })), []);
test("textContent: valid variable", doc(text({ content: "$myText" })), []);
test(
  "textContent: valid styled spans",
  doc(text({ content: [{ content: "bold" }] })),
  [],
);
test(
  "textContent: valid multiple spans",
  doc(text({ content: [{ content: "hello " }, { content: "world" }] })),
  [],
);
test("textContent: invalid number", doc(text({ content: 123 })), [
  '/children/0/content: expected one of: string, "$variable", textStyle[], got 123',
]);
test("textContent: invalid boolean", doc(text({ content: true })), [
  '/children/0/content: expected one of: string, "$variable", textStyle[], got true',
]);
test("textContent: invalid null", doc(text({ content: null })), [
  '/children/0/content: expected one of: string, "$variable", textStyle[], got null',
]);

// --- child: discriminated union on type ---

test("child: valid frame", doc(frame({})), []);
test("child: valid rectangle", doc(rect({})), []);
test("child: valid ellipse", doc(ellipse({})), []);
test("child: valid text", doc(text({})), []);
test("child: invalid type", doc({ id: "c1", type: "invalid" }), [
  '/children/0/type: expected one of: "frame", "group", "rectangle", "ellipse", "line", "polygon", "path", "text", "connection", "note", "context", "prompt", "icon_font", "ref", got "invalid"',
]);
test("child: missing type", doc({ id: "c1" }), [
  '/children/0/type: expected one of: "frame", "group", "rectangle", "ellipse", "line", "polygon", "path", "text", "connection", "note", "context", "prompt", "icon_font", "ref", got undefined',
]);
test("child: not an object", doc("hello"), [
  '/children/0: expected one of: "frame", "group", "rectangle", "ellipse", "line", "polygon", "path", "text", "connection", "note", "context", "prompt", "icon_font", "ref", got "hello"',
]);
test("child: null", doc(null), [
  '/children/0: expected one of: "frame", "group", "rectangle", "ellipse", "line", "polygon", "path", "text", "connection", "note", "context", "prompt", "icon_font", "ref", got null',
]);
test("child: number", doc(42), [
  '/children/0: expected one of: "frame", "group", "rectangle", "ellipse", "line", "polygon", "path", "text", "connection", "note", "context", "prompt", "icon_font", "ref", got 42',
]);

// --- colorOrVariable ---

test(
  "colorOrVariable: valid hex 3",
  doc(rect({ fill: { type: "color", color: "#fff" } })),
  [],
);
test(
  "colorOrVariable: valid hex 6",
  doc(rect({ fill: { type: "color", color: "#ff0000" } })),
  [],
);
test(
  "colorOrVariable: valid hex 8",
  doc(rect({ fill: { type: "color", color: "#ff000080" } })),
  [],
);
test(
  "colorOrVariable: valid variable",
  doc(rect({ fill: { type: "color", color: "$primary" } })),
  [],
);
test(
  "colorOrVariable: invalid hex pattern",
  doc(rect({ fill: { type: "color", color: "#xyz" } })),
  [
    '/children/0/fill/color: expected either color hex string (#RRGGBBAA, #RRGGBB or #RGB) or "$variable", got "#xyz"',
  ],
);
test(
  "colorOrVariable: invalid no hash",
  doc(rect({ fill: { type: "color", color: "ff0000" } })),
  [
    '/children/0/fill/color: expected either color hex string (#RRGGBBAA, #RRGGBB or #RGB) or "$variable", got "ff0000"',
  ],
);
test(
  "colorOrVariable: invalid number",
  doc(rect({ fill: { type: "color", color: 0xff0000 } })),
  [
    '/children/0/fill/color: expected either color hex string (#RRGGBBAA, #RRGGBB or #RGB) or "$variable", got 16711680',
  ],
);

// --- booleanOrVariable ---

test(
  "booleanOrVariable: valid true",
  doc(rect({ fill: { type: "color", color: "#fff", enabled: true } })),
  [],
);
test(
  "booleanOrVariable: valid false",
  doc(rect({ fill: { type: "color", color: "#fff", enabled: false } })),
  [],
);
test(
  "booleanOrVariable: valid variable",
  doc(rect({ fill: { type: "color", color: "#fff", enabled: "$e" } })),
  [],
);
test(
  "booleanOrVariable: invalid string",
  doc(rect({ fill: { type: "color", color: "#fff", enabled: "yes" } })),
  [
    '/children/0/fill/enabled: expected either boolean or "$variable", got "yes"',
  ],
);
test(
  "booleanOrVariable: invalid number",
  doc(rect({ fill: { type: "color", color: "#fff", enabled: 1 } })),
  ['/children/0/fill/enabled: expected either boolean or "$variable", got 1'],
);

// --- stroke ---

test(
  "stroke: valid uniform thickness",
  doc(rect({ stroke: { thickness: 2 } })),
  [],
);
test(
  "stroke: valid variable thickness",
  doc(rect({ stroke: { thickness: "$t" } })),
  [],
);
test(
  "stroke: valid per-side thickness",
  doc(
    rect({ stroke: { thickness: { top: 1, right: 2, bottom: 3, left: 4 } } }),
  ),
  [],
);
test(
  "stroke: valid per-side with variables",
  doc(
    rect({
      stroke: { thickness: { top: "$t", right: 2, bottom: "$b", left: 4 } },
    }),
  ),
  [],
);
test(
  "stroke: invalid thickness string",
  doc(rect({ stroke: { thickness: "abc" } })),
  [
    '/children/0/stroke/thickness: expected one of: number, "$variable", object, got "abc"',
  ],
);
test(
  "stroke: invalid thickness boolean",
  doc(rect({ stroke: { thickness: true } })),
  [
    '/children/0/stroke/thickness: expected one of: number, "$variable", object, got true',
  ],
);
test(
  "stroke: valid align inside",
  doc(rect({ stroke: { align: "inside" } })),
  [],
);
test(
  "stroke: valid align center",
  doc(rect({ stroke: { align: "center" } })),
  [],
);
test(
  "stroke: valid align outside",
  doc(rect({ stroke: { align: "outside" } })),
  [],
);
test("stroke: invalid align", doc(rect({ stroke: { align: "bad" } })), [
  '/children/0/stroke/align: expected one of: "inside", "center", "outside", got "bad"',
]);
test("stroke: not an object", doc(rect({ stroke: "abc" })), [
  '/children/0/stroke: expected object, got "abc"',
]);

// --- cornerRadius: number or [4] ---

test("cornerRadius: valid number", doc(rect({ cornerRadius: 8 })), []);
test("cornerRadius: valid zero", doc(rect({ cornerRadius: 0 })), []);
test("cornerRadius: valid variable", doc(rect({ cornerRadius: "$r" })), []);
test(
  "cornerRadius: valid per-corner",
  doc(rect({ cornerRadius: [1, 2, 3, 4] })),
  [],
);
test(
  "cornerRadius: valid per-corner with variables",
  doc(rect({ cornerRadius: ["$a", 2, "$c", 4] })),
  [],
);
test("cornerRadius: invalid string", doc(rect({ cornerRadius: "abc" })), [
  '/children/0/cornerRadius: expected one of: number, "$variable", (number | "$variable")[4], got "abc"',
]);
test(
  "cornerRadius: invalid array length 3",
  doc(rect({ cornerRadius: [1, 2, 3] })),
  [
    '/children/0/cornerRadius: expected one of: number, "$variable", (number | "$variable")[4], got [1,2,3]',
  ],
);

// --- layout ---

test("layout: valid none", doc(frame({ layout: "none" })), []);
test("layout: valid vertical", doc(frame({ layout: "vertical" })), []);
test("layout: valid horizontal", doc(frame({ layout: "horizontal" })), []);
test("layout: invalid", doc(frame({ layout: "grid" })), [
  '/children/0/layout: expected one of: "none", "vertical", "horizontal", got "grid"',
]);
test("layout: valid gap", doc(frame({ layout: "vertical", gap: 10 })), []);
test(
  "layout: valid gap variable",
  doc(frame({ layout: "vertical", gap: "$g" })),
  [],
);
test("layout: invalid gap", doc(frame({ layout: "vertical", gap: "abc" })), [
  '/children/0/gap: expected either number or "$variable", got "abc"',
]);
test(
  "layout: valid justifyContent",
  doc(frame({ layout: "vertical", justifyContent: "center" })),
  [],
);
test(
  "layout: invalid justifyContent",
  doc(frame({ layout: "vertical", justifyContent: "stretch" })),
  [
    '/children/0/justifyContent: expected one of: "start", "center", "end", "space_between", "space_around", got "stretch"',
  ],
);
test(
  "layout: valid alignItems",
  doc(frame({ layout: "vertical", alignItems: "center" })),
  [],
);
test(
  "layout: invalid alignItems",
  doc(frame({ layout: "vertical", alignItems: "stretch" })),
  [
    '/children/0/alignItems: expected one of: "start", "center", "end", got "stretch"',
  ],
);

// --- entity properties ---

test("entity: missing id", doc({ type: "rectangle" }), [
  '/children/0/id: missing required property, got {"type":"rectangle"}',
]);
test("entity: invalid id type", doc({ id: 123, type: "rectangle" }), [
  "/children/0/id: expected string without slashes, got 123",
]);
test("entity: id with slash", doc({ id: "a/b", type: "rectangle" }), [
  '/children/0/id: expected string without slashes, got "a/b"',
]);
test("entity: valid name", doc(rect({ name: "My Shape" })), []);
test("entity: invalid name type", doc(rect({ name: 123 })), [
  "/children/0/name: expected string, got 123",
]);
test("entity: valid opacity", doc(rect({ opacity: 0.5 })), []);
test("entity: valid opacity variable", doc(rect({ opacity: "$o" })), []);
test("entity: invalid opacity", doc(rect({ opacity: "half" })), [
  '/children/0/opacity: expected either number or "$variable", got "half"',
]);
test("entity: valid reusable", doc(rect({ reusable: true })), []);
test("entity: invalid reusable", doc(rect({ reusable: "yes" })), [
  '/children/0/reusable: expected boolean, got "yes"',
]);
test("entity: valid flipX", doc(rect({ flipX: true })), []);
test("entity: valid flipY variable", doc(rect({ flipY: "$flip" })), []);

// --- nested children ---

test(
  "nested: frame with valid children",
  doc(frame({ children: [rect({}), ellipse({})] })),
  [],
);
test(
  "nested: frame with invalid child type",
  doc(frame({ children: [{ id: "x", type: "bad" }] })),
  [
    '/children/0/children/0/type: expected one of: "frame", "group", "rectangle", "ellipse", "line", "path", "polygon", "text", "note", "prompt", "context", "icon_font", "ref", got "bad"',
  ],
);
test("nested: children not an array", doc(frame({ children: "bad" })), [
  '/children/0/children: expected array, got "bad"',
]);
test(
  "nested: deeply nested error",
  doc(
    frame({
      children: [frame({ children: [rect({ fill: { type: "bad" } })] })],
    }),
  ),
  [
    '/children/0/children/0/children/0/fill/type: expected one of: "color", "gradient", "image", "mesh_gradient", got "bad"',
  ],
);

// --- document level ---

test("document: missing version", { children: [] }, [
  '/version: missing required property, got {"children":[]}',
]);
test("document: invalid version type", { version: 1, children: [] }, [
  "/version: expected string, got 1",
]);
test("document: not an object", "hello", [': expected object, got "hello"']);
test("document: null", null, [": expected object, got null"]);
test("document: valid empty", base, []);

// --- fonts ---

test(
  "fonts: valid font",
  {
    ...base,
    fonts: [{ name: "Inter", url: "https://example.com/inter.woff2" }],
  },
  [],
);
test(
  "fonts: valid font with style",
  {
    ...base,
    fonts: [
      {
        name: "Inter",
        url: "https://example.com/inter.woff2",
        style: "italic",
      },
    ],
  },
  [],
);
test(
  "fonts: invalid font style",
  { ...base, fonts: [{ name: "Inter", style: "bold" }] },
  ['/fonts/0/style: expected one of: "normal", "italic", got "bold"'],
);
test(
  "fonts: valid weight number",
  { ...base, fonts: [{ name: "Inter", weight: 400 }] },
  [],
);
test(
  "fonts: valid weight range",
  { ...base, fonts: [{ name: "Inter", weight: [100, 900] }] },
  [],
);
test(
  "fonts: invalid weight string",
  { ...base, fonts: [{ name: "Inter", weight: "bold" }] },
  ['/fonts/0/weight: expected either number or number[2], got "bold"'],
);
test(
  "fonts: invalid weight range length",
  { ...base, fonts: [{ name: "Inter", weight: [100, 400, 900] }] },
  ["/fonts/0/weight: expected either number or number[2], got [100,400,900]"],
);

// --- variables ---

test(
  "variables: valid boolean",
  { ...base, variables: { myBool: { type: "boolean", value: true } } },
  [],
);
test(
  "variables: valid color",
  { ...base, variables: { myColor: { type: "color", value: "#ff0000" } } },
  [],
);
test(
  "variables: valid number",
  { ...base, variables: { myNum: { type: "number", value: 42 } } },
  [],
);
test(
  "variables: valid string",
  { ...base, variables: { myStr: { type: "string", value: "hello" } } },
  [],
);
test(
  "variables: invalid type",
  { ...base, variables: { x: { type: "invalid", value: 1 } } },
  [
    '/variables/x/type: expected one of: "boolean", "color", "number", "string", got "invalid"',
  ],
);
test(
  "variables: valid themed value",
  {
    ...base,
    variables: {
      c: {
        type: "color",
        value: [
          { value: "#fff", theme: { mode: "light" } },
          { value: "#000", theme: { mode: "dark" } },
        ],
      },
    },
  },
  [],
);

// --- ref ---

test("ref: valid", doc({ id: "r1", type: "ref", ref: "myComponent" }), []);
test("ref: missing ref", doc({ id: "r1", type: "ref" }), [
  '/children/0/ref: missing required property, got {"id":"r1","type":"ref"}',
]);
test(
  "ref: invalid ref with slash",
  doc({ id: "r1", type: "ref", ref: "a/b" }),
  ['/children/0/ref: expected string without slashes, got "a/b"'],
);
test(
  "ref: additional properties allowed (component overrides)",
  doc({
    id: "r1",
    type: "ref",
    ref: "myComponent",
    width: 100,
    fill: "#ff0000",
    customProp: true,
  }),
  [],
);

// --- multiple errors ---

test(
  "multiple errors on same node",
  doc({ id: 123, type: "rectangle", fill: "bad", opacity: "bad" }),
  [
    "/children/0/id: expected string without slashes, got 123",
    '/children/0/opacity: expected either number or "$variable", got "bad"',
    '/children/0/fill: expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), "$variable", {type: "color"}, {type: "gradient"}, {type: "image"}, {type: "mesh_gradient"}, got "bad"',
  ],
);

// --- ellipse specific ---

test("ellipse: valid innerRadius", doc(ellipse({ innerRadius: 0.5 })), []);
test(
  "ellipse: valid innerRadius variable",
  doc(ellipse({ innerRadius: "$ir" })),
  [],
);

// --- text specific ---

test("text: valid textGrowth auto", doc(text({ textGrowth: "auto" })), []);
test(
  "text: valid textGrowth fixed-width",
  doc(text({ textGrowth: "fixed-width" })),
  [],
);
test("text: invalid textGrowth", doc(text({ textGrowth: "flexible" })), [
  '/children/0/textGrowth: expected one of: "auto", "fixed-width", "fixed-width-height", got "flexible"',
]);

// --- frame specific ---

test("frame: valid clip boolean", doc(frame({ clip: true })), []);
test("frame: valid clip variable", doc(frame({ clip: "$c" })), []);
test("frame: invalid clip string", doc(frame({ clip: "yes" })), [
  '/children/0/clip: expected either boolean or "$variable", got "yes"',
]);
test("frame: valid placeholder", doc(frame({ placeholder: true })), []);
test("frame: invalid placeholder", doc(frame({ placeholder: "yes" })), [
  '/children/0/placeholder: expected boolean, got "yes"',
]);

// --- position ---

test("position: valid x and y", doc(rect({ x: 10, y: 20 })), []);
test("position: valid negative", doc(rect({ x: -5, y: -10 })), []);
test("position: invalid x", doc(rect({ x: "left" })), [
  '/children/0/x: expected number, got "left"',
]);
test("position: invalid y", doc(rect({ y: true })), [
  "/children/0/y: expected number, got true",
]);

// --- rotation ---

test("rotation: valid number", doc(rect({ rotation: 45 })), []);
test("rotation: valid variable", doc(rect({ rotation: "$rot" })), []);
test("rotation: invalid string", doc(rect({ rotation: "45deg" })), [
  '/children/0/rotation: expected either number or "$variable", got "45deg"',
]);

// --- line ---

test("line: valid minimal", doc(line({})), []);
test("line: valid with fill", doc(line({ fill: "#ff0000" })), []);
test("line: invalid fill", doc(line({ fill: 123 })), [
  '/children/0/fill: expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), "$variable", {type: "color"}, {type: "gradient"}, {type: "image"}, {type: "mesh_gradient"}, got 123',
]);

// --- polygon ---

test("polygon: valid minimal", doc(polygon({})), []);
test("polygon: valid polygonCount", doc(polygon({ polygonCount: 6 })), []);
test(
  "polygon: valid polygonCount variable",
  doc(polygon({ polygonCount: "$n" })),
  [],
);
test("polygon: invalid polygonCount", doc(polygon({ polygonCount: "six" })), [
  '/children/0/polygonCount: expected either number or "$variable", got "six"',
]);

// --- path ---

test("path: valid minimal", doc(path({})), []);
test("path: valid fillRule nonzero", doc(path({ fillRule: "nonzero" })), []);
test("path: valid fillRule evenodd", doc(path({ fillRule: "evenodd" })), []);
test("path: invalid fillRule", doc(path({ fillRule: "winding" })), [
  '/children/0/fillRule: expected one of: "nonzero", "evenodd", got "winding"',
]);
test(
  "path: valid geometry string",
  doc(path({ geometry: "M 0 0 L 100 0" })),
  [],
);
test("path: invalid geometry", doc(path({ geometry: 123 })), [
  "/children/0/geometry: expected string, got 123",
]);

// --- group ---

test("group: valid minimal", doc(group({})), []);
test(
  "group: valid with children",
  doc(group({ children: [rect({}), ellipse({})] })),
  [],
);
test("group: invalid width", doc(group({ width: 100 })), [
  "/children/0/width: expected sizing behavior (fit_content or fill_container, with optional fallback size like fit_content(100)), got 100",
]);
test("group: valid width sizing", doc(group({ width: "fit_content" })), []);

// --- connection ---

test(
  "connection: valid minimal",
  doc(
    connection({
      source: { path: "a", anchor: "center" },
      target: { path: "b", anchor: "top" },
    }),
  ),
  [],
);
test(
  "connection: valid with nested path",
  doc(
    connection({
      source: { path: "a/b/c", anchor: "left" },
      target: { path: "x/y", anchor: "right" },
    }),
  ),
  [],
);
test(
  "connection: missing source",
  doc(connection({ target: { path: "b", anchor: "center" } })),
  [
    '/children/0/source: missing required property, got {"id":"cn1","type":"connection","target":{"path":"b","anchor":"center"}}',
  ],
);
test(
  "connection: missing target",
  doc(connection({ source: { path: "a", anchor: "center" } })),
  [
    '/children/0/target: missing required property, got {"id":"cn1","type":"connection","source":{"path":"a","anchor":"center"}}',
  ],
);
test(
  "connection: invalid anchor",
  doc(
    connection({
      source: { path: "a", anchor: "middle" },
      target: { path: "b", anchor: "center" },
    }),
  ),
  [
    '/children/0/source/anchor: expected one of: "center", "top", "left", "bottom", "right", got "middle"',
  ],
);
test(
  "connection: invalid idPath (empty segment)",
  doc(
    connection({
      source: { path: "a//b", anchor: "center" },
      target: { path: "b", anchor: "center" },
    }),
  ),
  ['/children/0/source/path: expected slash-separated path of IDs, got "a//b"'],
);
test(
  "connection: source path not a string",
  doc(
    connection({
      source: { path: 123, anchor: "center" },
      target: { path: "b", anchor: "center" },
    }),
  ),
  ["/children/0/source/path: expected slash-separated path of IDs, got 123"],
);

// --- note ---

test("note: valid minimal", doc(note({})), []);
test("note: valid with content", doc(note({ content: "hello" })), []);
test("note: invalid content", doc(note({ content: 123 })), [
  '/children/0/content: expected one of: string, "$variable", textStyle[], got 123',
]);
test("note: valid fontSize", doc(note({ fontSize: 14 })), []);
test("note: invalid fontSize", doc(note({ fontSize: "big" })), [
  '/children/0/fontSize: expected either number or "$variable", got "big"',
]);

// --- prompt ---

test("prompt: valid minimal", doc(prompt({})), []);
test("prompt: valid with model", doc(prompt({ model: "gpt-4" })), []);
test("prompt: valid with model variable", doc(prompt({ model: "$m" })), []);
test("prompt: invalid model", doc(prompt({ model: 123 })), [
  '/children/0/model: expected either string or "$variable", got 123',
]);

// --- context ---

test("context: valid minimal", doc(context({})), []);
test(
  "context: valid with content",
  doc(context({ content: "some context" })),
  [],
);
test("context: invalid content", doc(context({ content: false })), [
  '/children/0/content: expected one of: string, "$variable", textStyle[], got false',
]);

// --- icon_font ---

test("iconFont: valid minimal", doc(iconFont({})), []);
test(
  "iconFont: valid with name and family",
  doc(iconFont({ iconFontName: "star", iconFontFamily: "lucide" })),
  [],
);
test(
  "iconFont: valid name variable",
  doc(iconFont({ iconFontName: "$icon" })),
  [],
);
test("iconFont: invalid iconFontName", doc(iconFont({ iconFontName: 123 })), [
  '/children/0/iconFontName: expected either string or "$variable", got 123',
]);
test(
  "iconFont: invalid iconFontFamily",
  doc(iconFont({ iconFontFamily: 42 })),
  ['/children/0/iconFontFamily: expected either string or "$variable", got 42'],
);
test("iconFont: valid weight", doc(iconFont({ weight: 400 })), []);
test("iconFont: invalid weight", doc(iconFont({ weight: "bold" })), [
  '/children/0/weight: expected either number or "$variable", got "bold"',
]);

// --- stringOrVariable ---

test("stringOrVariable: valid string", doc(text({ fontFamily: "Inter" })), []);
test(
  "stringOrVariable: valid variable",
  doc(text({ fontFamily: "$font" })),
  [],
);
test("stringOrVariable: invalid number", doc(text({ fontFamily: 42 })), [
  '/children/0/fontFamily: expected either string or "$variable", got 42',
]);
test("stringOrVariable: invalid boolean", doc(text({ fontFamily: true })), [
  '/children/0/fontFamily: expected either string or "$variable", got true',
]);
test("stringOrVariable: invalid null", doc(text({ fontFamily: null })), [
  '/children/0/fontFamily: expected either string or "$variable", got null',
]);

// --- textStyle properties ---

test("textStyle: valid textAlign", doc(text({ textAlign: "center" })), []);
test("textStyle: valid textAlign left", doc(text({ textAlign: "left" })), []);
test(
  "textStyle: valid textAlign justify",
  doc(text({ textAlign: "justify" })),
  [],
);
test("textStyle: invalid textAlign", doc(text({ textAlign: "middle" })), [
  '/children/0/textAlign: expected one of: "left", "center", "right", "justify", got "middle"',
]);
test(
  "textStyle: valid textAlignVertical",
  doc(text({ textAlignVertical: "middle" })),
  [],
);
test(
  "textStyle: invalid textAlignVertical",
  doc(text({ textAlignVertical: "center" })),
  [
    '/children/0/textAlignVertical: expected one of: "top", "middle", "bottom", got "center"',
  ],
);
test("textStyle: valid underline", doc(text({ underline: true })), []);
test("textStyle: invalid underline", doc(text({ underline: "yes" })), [
  '/children/0/underline: expected either boolean or "$variable", got "yes"',
]);
test("textStyle: valid strikethrough", doc(text({ strikethrough: false })), []);
test("textStyle: valid letterSpacing", doc(text({ letterSpacing: 1.5 })), []);
test(
  "textStyle: invalid letterSpacing",
  doc(text({ letterSpacing: "tight" })),
  [
    '/children/0/letterSpacing: expected either number or "$variable", got "tight"',
  ],
);
test("textStyle: valid lineHeight", doc(text({ lineHeight: 1.4 })), []);
test("textStyle: invalid lineHeight", doc(text({ lineHeight: "1.4em" })), [
  '/children/0/lineHeight: expected either number or "$variable", got "1.4em"',
]);
test("textStyle: valid href", doc(text({ href: "https://example.com" })), []);
test("textStyle: invalid href", doc(text({ href: 123 })), [
  "/children/0/href: expected string, got 123",
]);

// --- ref descendants ---

test(
  "ref: valid with descendants",
  doc({
    id: "r1",
    type: "ref",
    ref: "myComp",
    descendants: { child1: { fill: "#ff0000" } },
  }),
  [],
);
test(
  "ref: invalid descendant key (empty segment)",
  doc({
    id: "r1",
    type: "ref",
    ref: "myComp",
    descendants: { "a//b": { fill: "#ff0000" } },
  }),
  [
    '/children/0/descendants/a//b: expected slash-separated path of IDs, got "a//b"',
  ],
);
test(
  "ref: descendants not an object",
  doc({ id: "r1", type: "ref", ref: "myComp", descendants: "bad" }),
  ['/children/0/descendants: expected object, got "bad"'],
);
test(
  "ref: invalid descendant value (non-object)",
  doc({
    id: "r1",
    type: "ref",
    ref: "myComp",
    descendants: { child1: "bad" },
  }),
  ['/children/0/descendants/child1: expected object, got "bad"'],
);
test(
  "ref: invalid descendant value (number)",
  doc({
    id: "r1",
    type: "ref",
    ref: "myComp",
    descendants: { child1: 42 },
  }),
  ["/children/0/descendants/child1: expected object, got 42"],
);
test(
  "ref: invalid descendant value (null)",
  doc({
    id: "r1",
    type: "ref",
    ref: "myComp",
    descendants: { child1: null },
  }),
  ["/children/0/descendants/child1: expected object, got null"],
);

// --- imports: additionalProperties must be strings ---

test(
  "imports: valid string values",
  { ...base, imports: { foo: "./foo.pen", bar: "./bar.pen" } },
  [],
);
test("imports: invalid value (number)", { ...base, imports: { foo: 42 } }, [
  "/imports/foo: expected string, got 42",
]);
test("imports: invalid value (boolean)", { ...base, imports: { foo: true } }, [
  "/imports/foo: expected string, got true",
]);
test("imports: invalid value (object)", { ...base, imports: { foo: {} } }, [
  "/imports/foo: expected string, got {}",
]);
test("imports: not an object", { ...base, imports: "bad" }, [
  '/imports: expected object, got "bad"',
]);

// --- document: missing / invalid children ---

test("document: missing children", { version: "1.0" }, [
  '/children: missing required property, got {"version":"1.0"}',
]);
test("document: children not an array", { version: "1.0", children: {} }, [
  "/children: expected array, got {}",
]);
test("document: children null", { version: "1.0", children: null }, [
  "/children: expected array, got null",
]);

// --- child array indexing ---

test(
  "children: second child invalid",
  doc(rect({}), { id: "c2", type: "bad" }),
  [
    '/children/1/type: expected one of: "frame", "group", "rectangle", "ellipse", "line", "polygon", "path", "text", "connection", "note", "context", "prompt", "icon_font", "ref", got "bad"',
  ],
);
test(
  "children: multiple errors across children",
  doc(rect({ fill: 123 }), text({ content: 456 })),
  [
    '/children/0/fill: expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), "$variable", {type: "color"}, {type: "gradient"}, {type: "image"}, {type: "mesh_gradient"}, got 123',
    '/children/1/content: expected one of: string, "$variable", textStyle[], got 456',
  ],
);

// --- theme additionalProperties ---

test(
  "theme: valid theme values",
  {
    ...base,
    variables: {
      c: {
        type: "color",
        value: [{ value: "#fff", theme: { mode: "light", device: "phone" } }],
      },
    },
  },
  [],
);
test(
  "theme: invalid theme value (non-string)",
  {
    ...base,
    variables: {
      c: {
        type: "color",
        value: [{ value: "#fff", theme: { mode: 42 } }],
      },
    },
  },
  ["/variables/c/value/0/theme/mode: expected string, got 42"],
);

// --- variables: invalid themed value ---

test(
  "variables: themed value with bad color",
  {
    ...base,
    variables: {
      c: {
        type: "color",
        value: [{ value: "not-a-color", theme: { mode: "light" } }],
      },
    },
  },
  [
    '/variables/c/value/0/value: expected either color hex string (#RRGGBBAA, #RRGGBB or #RGB) or "$variable", got "not-a-color"',
  ],
);

// --- additionalProperties: unknown properties rejected on concrete types ---

test(
  "additionalProperties: rectangle rejects unknown prop",
  doc(rect({ unknown: true })),
  ['/children/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: frame rejects unknown prop",
  doc(frame({ unknown: true })),
  ['/children/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: ellipse rejects unknown prop",
  doc(ellipse({ unknown: "x" })),
  ['/children/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: text rejects unknown prop",
  doc(text({ unknown: 1 })),
  ['/children/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: line rejects unknown prop",
  doc(line({ unknown: true })),
  ['/children/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: polygon rejects unknown prop",
  doc(polygon({ unknown: true })),
  ['/children/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: path rejects unknown prop",
  doc(path({ unknown: true })),
  ['/children/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: group rejects unknown prop",
  doc(group({ unknown: true })),
  ['/children/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: connection rejects unknown prop",
  doc(
    connection({
      source: { path: "a", anchor: "top" },
      target: { path: "b", anchor: "bottom" },
      unknown: true,
    }),
  ),
  ['/children/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: note rejects unknown prop",
  doc(note({ unknown: true })),
  ['/children/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: iconFont rejects unknown prop",
  doc(iconFont({ iconFontName: "home", unknown: true })),
  ['/children/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: document rejects unknown prop",
  { ...base, unknown: true },
  ['/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: rectangle known props not rejected",
  doc(
    rect({
      fill: "#ff0000",
      width: 100,
      height: 50,
      cornerRadius: [4, 4, 4, 4],
    }),
  ),
  [],
);
test(
  "additionalProperties: frame known props not rejected",
  doc(
    frame({ layout: "vertical", padding: 8, gap: 4, width: 200, height: 100 }),
  ),
  [],
);

// --- additionalProperties: nested fill objects ---

test(
  "additionalProperties: gradient fill rejects unknown prop",
  doc(rect({ fill: { type: "gradient", unknown: true } })),
  ['/children/0/fill/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: gradient color stop rejects unknown prop",
  doc(
    rect({
      fill: {
        type: "gradient",
        colors: [{ color: "#ff0000", position: 0, unknown: true }],
      },
    }),
  ),
  ['/children/0/fill/colors/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: color fill rejects unknown prop",
  doc(rect({ fill: { type: "color", color: "#ff0000", unknown: true } })),
  ['/children/0/fill/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: image fill rejects unknown prop",
  doc(rect({ fill: { type: "image", url: "./x.png", unknown: true } })),
  ['/children/0/fill/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: mesh_gradient fill rejects unknown prop",
  doc(rect({ fill: { type: "mesh_gradient", unknown: true } })),
  ['/children/0/fill/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: gradient fill known props not rejected",
  doc(
    rect({
      fill: {
        type: "gradient",
        gradientType: "linear",
        opacity: 1,
        colors: [{ color: "#ff0000", position: 0 }],
      },
    }),
  ),
  [],
);

// --- additionalProperties: fonts and axes ---

test(
  "additionalProperties: font object rejects unknown prop",
  { ...base, fonts: [{ name: "Foo", unknown: true }] },
  ['/fonts/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: font axis object rejects unknown prop",
  {
    ...base,
    fonts: [
      {
        name: "Foo",
        axes: [{ tag: "wght", start: 100, end: 900, unknown: true }],
      },
    ],
  },
  ['/fonts/0/axes/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: font object known props not rejected",
  {
    ...base,
    fonts: [{ name: "Foo", url: "./Foo.ttf", style: "normal", weight: 400 }],
  },
  [],
);

// --- additionalProperties: variable definitions ---

test(
  "additionalProperties: variable color definition rejects unknown prop",
  {
    ...base,
    variables: { c: { type: "color", value: "#ff0000", unknown: true } },
  },
  ['/variables/c/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: variable themed value item rejects unknown prop",
  {
    ...base,
    variables: {
      c: {
        type: "color",
        value: [{ value: "#ff0000", theme: { mode: "light" }, unknown: true }],
      },
    },
  },
  ['/variables/c/value/0/unknown: unexpected property, got "unknown"'],
);

// --- additionalProperties: stroke ---

test(
  "additionalProperties: stroke object rejects unknown prop",
  doc(rect({ stroke: { align: "center", unknown: true } })),
  ['/children/0/stroke/unknown: unexpected property, got "unknown"'],
);

// --- additionalProperties: effects ---

test(
  "additionalProperties: blur effect rejects unknown prop",
  doc(rect({ effect: { type: "blur", radius: 4, unknown: true } })),
  ['/children/0/effect/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: shadow effect rejects unknown prop",
  doc(
    rect({ effect: { type: "shadow", offset: { x: 0, y: 2 }, unknown: true } }),
  ),
  ['/children/0/effect/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: shadow offset rejects unknown prop",
  doc(
    rect({ effect: { type: "shadow", offset: { x: 0, y: 2, unknown: true } } }),
  ),
  ['/children/0/effect/offset/unknown: unexpected property, got "unknown"'],
);

// --- additionalProperties: connectionEndpoint ---

test(
  "additionalProperties: connectionEndpoint rejects unknown prop",
  doc(
    connection({
      source: { path: "a", anchor: "top", unknown: true },
      target: { path: "b", anchor: "bottom" },
    }),
  ),
  ['/children/0/source/unknown: unexpected property, got "unknown"'],
);

// --- additionalProperties: gradient size ---

test(
  "additionalProperties: gradient size object rejects unknown prop",
  doc(
    rect({
      fill: { type: "gradient", size: { width: 1, height: 1, unknown: true } },
    }),
  ),
  ['/children/0/fill/size/unknown: unexpected property, got "unknown"'],
);

// --- additionalProperties: textContent span items ---

test(
  "additionalProperties: textContent span item rejects unknown prop",
  doc(text({ content: [{ content: "hi", unknown: true }] })),
  ['/children/0/content/0/unknown: unexpected property, got "unknown"'],
);
test(
  "additionalProperties: textContent span item known props not rejected",
  doc(
    text({
      content: [
        {
          content: "hi",
          fontFamily: "Arial",
          fontSize: 14,
          fontWeight: "bold",
        },
      ],
    }),
  ),
  [],
);

// --- transform: color fix ---

function colorTransform(tag: string, value: unknown): unknown {
  if (tag === "color" && value === "transparent") {
    return "#00000000";
  }
}

testTransform(
  "transform: fix invalid color string on direct fill",
  doc(rect({ fill: "transparent" })),
  colorTransform,
  [],
  (input) => {
    const d = input as any;
    if (d.children[0].fill !== "#00000000")
      throw new Error(`fill not fixed: ${d.children[0].fill}`);
  },
);

testTransform(
  "transform: fix invalid color string in fills array",
  doc(rect({ fill: ["transparent"] })),
  colorTransform,
  [],
  (input) => {
    const d = input as any;
    if (d.children[0].fill[0] !== "#00000000")
      throw new Error(`fill[0] not fixed: ${d.children[0].fill[0]}`);
  },
);

testTransform(
  "transform: fix invalid color in color fill object",
  doc(rect({ fill: { type: "color", color: "transparent" } })),
  colorTransform,
  [],
  (input) => {
    const d = input as any;
    if (d.children[0].fill.color !== "#00000000")
      throw new Error(`fill.color not fixed: ${d.children[0].fill.color}`);
  },
);

testTransform(
  "transform: fix invalid color in gradient color stop",
  doc(
    rect({
      fill: {
        type: "gradient",
        colors: [{ color: "transparent", position: 0 }],
      },
    }),
  ),
  colorTransform,
  [],
  (input) => {
    const d = input as any;
    if (d.children[0].fill.colors[0].color !== "#00000000")
      throw new Error(`gradient stop color not fixed`);
  },
);

testTransform(
  "transform: fix invalid color in mesh_gradient colors array",
  doc(rect({ fill: { type: "mesh_gradient", colors: ["transparent"] } })),
  colorTransform,
  [],
  (input) => {
    const d = input as any;
    if (d.children[0].fill.colors[0] !== "#00000000")
      throw new Error(`mesh_gradient color not fixed`);
  },
);

testTransform(
  "transform: fix invalid color in stroke fill",
  doc(rect({ stroke: { fill: "transparent" } })),
  colorTransform,
  [],
  (input) => {
    const d = input as any;
    if (d.children[0].stroke.fill !== "#00000000")
      throw new Error(`stroke.fill not fixed`);
  },
);

testTransform(
  "transform: fix invalid color in icon_font fill",
  doc(iconFont({ fill: "transparent" })),
  colorTransform,
  [],
  (input) => {
    const d = input as any;
    if (d.children[0].fill !== "#00000000")
      throw new Error(`icon_font fill not fixed`);
  },
);

testTransform(
  "transform: fix invalid color in variable color definition",
  { ...base, variables: { c: { type: "color", value: "transparent" } } },
  colorTransform,
  [],
  (input) => {
    const d = input as any;
    if (d.variables.c.value !== "#00000000")
      throw new Error(`variable color not fixed`);
  },
);

testTransform(
  "transform: fix invalid color in themed variable value",
  {
    ...base,
    variables: {
      c: {
        type: "color",
        value: [
          { value: "transparent", theme: { mode: "light" } },
          { value: "#000000", theme: { mode: "dark" } },
        ],
      },
    },
  },
  colorTransform,
  [],
  (input) => {
    const d = input as any;
    if (d.variables.c.value[0].value !== "#00000000")
      throw new Error(`themed variable color not fixed`);
  },
);

testTransform(
  "transform: no transform fn - invalid color still errors",
  doc(rect({ fill: "transparent" })),
  (_tag, _value) => undefined,
  [
    '/children/0/fill: expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), "$variable", {type: "color"}, {type: "gradient"}, {type: "image"}, {type: "mesh_gradient"}, got "transparent"',
  ],
);

testTransform(
  "transform: returns undefined - invalid color still errors",
  doc(rect({ fill: "transparent" })),
  (_tag, _value) => undefined,
  [
    '/children/0/fill: expected one of: color hex string (#RRGGBBAA, #RRGGBB or #RGB), "$variable", {type: "color"}, {type: "gradient"}, {type: "image"}, {type: "mesh_gradient"}, got "transparent"',
  ],
);

testTransform(
  "transform: valid color not transformed",
  doc(rect({ fill: "#ff0000" })),
  (_tag, _value) => {
    throw new Error("should not be called");
  },
  [],
);
