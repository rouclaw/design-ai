"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  IPCDeviceManager: () => IPCDeviceManager,
  NEW_DOC_TYPES: () => NEW_DOC_TYPES,
  WebSocketRequestRouter: () => WebSocketRequestRouter
});
module.exports = __toCommonJS(index_exports);

// src/ipc-device-manager.ts
var fs = __toESM(require("fs"));
var path2 = __toESM(require("path"));
var import_agent = require("@ha/agent");
var import_mcp = require("@ha/mcp");
var import_shared = require("@ha/shared");

// raw-loader:/Users/apple/codespace/design/pencil-ai/packages/schema/generated-schema.md
var generated_schema_default = `# .pen File Schema

\`\`\`typescript
/** Each key must be an existing theme axis, and each value must be one of the possible values for that axis. E.g. { 'device': 'phone' } */
export interface Theme {
  [key: string]: string;
}

/** To bind a variable to a property, set the property to the dollar-prefixed name of the variable! */
export type Variable = string;

export type NumberOrVariable = number | Variable;

/** Colors can be 8-digit RGBA hex strings (e.g. #AABBCCDD), 6-digit RGB hex strings (e.g. #AABBCC) or 3-digit RGB hex strings (e.g. #ABC which means #AABBCC). */
export type Color = string;

export type ColorOrVariable = Color | Variable;

export type BooleanOrVariable = boolean | Variable;

export type StringOrVariable = string | Variable;

export interface Layout {
  /** Enable flex layout. None means all children are absolutely positioned and will not be affected by layout properties. Frames default to horizontal, groups default to none. */
  layout?: "none" | "vertical" | "horizontal";
  /** The gap between children in the main axis direction. Defaults to 0. */
  gap?: NumberOrVariable;
  layoutIncludeStroke?: boolean;
  /** The Inside padding along the edge of the container */
  padding?:
    | /** The inside padding to all sides */ NumberOrVariable
    | /** The inside horizontal and vertical padding */ [
        NumberOrVariable,
        NumberOrVariable,
      ]
    | /** Top, Right, Bottom, Left padding */ [
        NumberOrVariable,
        NumberOrVariable,
        NumberOrVariable,
        NumberOrVariable,
      ];
  /** Control the justify alignment of the children along the main axis. Defaults to 'start'. */
  justifyContent?:
    | "start"
    | "center"
    | "end"
    | "space_between"
    | "space_around";
  /** Control the alignment of children along the cross axis. Defaults to 'start'. */
  alignItems?: "start" | "center" | "end";
}

/** SizingBehavior controls the dynamic layout size.
- fit_content: Use the combined size of all children for the container size. Fallback is used when there are no children.
- fill_container: Use the parent size for the container size. Fallback is used when the parent has no layout.
Optional number in parentheses (e.g., 'fit_content(100)') specifies the fallback size. */
export type SizingBehavior = string;

/** Position is relative to the parent object's position. X increases rightwards, Y increases downwards.
IMPORTANT: x and y are IGNORED when parent uses flexbox layout. */
export interface Position {
  x?: number;
  y?: number;
}

export interface Size {
  width?: NumberOrVariable | SizingBehavior;
  height?: NumberOrVariable | SizingBehavior;
}

export interface CanHaveRotation {
  /** Rotation is represented in degrees, measured counter-clockwise. */
  rotation?: NumberOrVariable;
}

export type BlendMode =
  | "normal"
  | "darken"
  | "multiply"
  | "linearBurn"
  | "colorBurn"
  | "light"
  | "screen"
  | "linearDodge"
  | "colorDodge"
  | "overlay"
  | "softLight"
  | "hardLight"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

export type Fill =
  | ColorOrVariable
  | {
      type: "color";
      enabled?: BooleanOrVariable;
      blendMode?: BlendMode;
      color: ColorOrVariable;
    }
  | {
      type: "gradient";
      enabled?: BooleanOrVariable;
      blendMode?: BlendMode;
      gradientType?: "linear" | "radial" | "angular";
      opacity?: NumberOrVariable;
      /** Normalized to bounding box (default: 0.5,0.5). */
      center?: Position;
      /** Normalized to bounding box (default: 1,1). Linear: height sets gradient length, width is ignored. Radial/Angular: sets ellipse diameters. */
      size?: { width?: NumberOrVariable; height?: NumberOrVariable };
      /** Rotation in degrees, counterclockwise (0\xB0 up, 90\xB0 left, 180\xB0 down). */
      rotation?: NumberOrVariable;
      colors?: { color: ColorOrVariable; position: NumberOrVariable }[];
    }
  /** Image fill. Url needs to be a relative from the pen file, for example \`../../file.png\` or \`./image.jpg\` */
  | {
      type: "image";
      enabled?: BooleanOrVariable;
      blendMode?: BlendMode;
      opacity?: NumberOrVariable;
      url: string;
      mode?: "stretch" | "fill" | "fit";
    }
  /** Grid of colors with bezier-interpolated edges. Row-major order. Adjust the points and handles to create complex gradients. Keep the points on the edges at their default position. */
  | {
      type: "mesh_gradient";
      enabled?: BooleanOrVariable;
      blendMode?: BlendMode;
      opacity?: NumberOrVariable;
      columns?: number;
      rows?: number;
      /** Color per vertex. */
      colors?: ColorOrVariable[];
      /** columns * rows points in [0,1] normalized coordinates. */
      points?: (
        | /** Position with auto-generated handles. */ [number, number]
        | /** Position with optional bezier handles (relative offsets). Omitted handles are auto-generated. */ {
            position: [number, number];
            leftHandle?: [number, number];
            rightHandle?: [number, number];
            topHandle?: [number, number];
            bottomHandle?: [number, number];
          }
      )[];
    };

export type Fills = Fill | Fill[];

export interface Stroke {
  align?: "inside" | "center" | "outside";
  thickness?:
    | NumberOrVariable
    | {
        top?: NumberOrVariable;
        right?: NumberOrVariable;
        bottom?: NumberOrVariable;
        left?: NumberOrVariable;
      };
  join?: "miter" | "bevel" | "round";
  miterAngle?: NumberOrVariable;
  cap?: "none" | "round" | "square";
  dashPattern?: number[];
  fill?: Fills;
}

export type Effect =
  /** 'blur' type blurs the entire layer content */
  | { enabled?: BooleanOrVariable; type: "blur"; radius?: NumberOrVariable }
  /** 'background_blur' type blurs the background content behind the layer */
  | {
      enabled?: BooleanOrVariable;
      type: "background_blur";
      radius?: NumberOrVariable;
    }
  /** The drop shadow effect can be an inner or outer shadow, with adjustable offset, spread, blur, color and blend mode. */
  | {
      type: "shadow";
      enabled?: BooleanOrVariable;
      shadowType?: "inner" | "outer";
      offset?: { x: NumberOrVariable; y: NumberOrVariable };
      spread?: NumberOrVariable;
      blur?: NumberOrVariable;
      color?: ColorOrVariable;
      blendMode?: BlendMode;
    };

export type Effects = Effect | Effect[];

export interface CanHaveGraphics {
  stroke?: Stroke;
  fill?: Fills;
  effect?: Effects;
}

export interface CanHaveEffects {
  effect?: Effects;
}

/** Entities have unique identifiers. */
export interface Entity extends Position, CanHaveRotation {
  /** A unique string that MUST NOT contain slash (/) characters. If omitted, a unique ID will be generated automatically. */
  id: string;
  /** Optional name for the entity, used for display and identification purposes */
  name?: string;
  /** Optional context information about this object. */
  context?: string;
  /** Objects are not reusable by default. If an object is made reusable by setting this property to \`true\`, the object can be duplicated using \`ref\` objects. */
  reusable?: boolean;
  theme?: Theme;
  enabled?: BooleanOrVariable;
  opacity?: NumberOrVariable;
  flipX?: BooleanOrVariable;
  flipY?: BooleanOrVariable;
  /** layoutPosition controls how a node is positioned within its parent. */
  layoutPosition?: "auto" | "absolute";
  metadata?: { type: string; [key: string]: any };
}

export interface Rectangleish extends Entity, Size, CanHaveGraphics {
  cornerRadius?:
    | NumberOrVariable
    | [NumberOrVariable, NumberOrVariable, NumberOrVariable, NumberOrVariable];
}

/** A rectangle is defined by its position and size. The position corresponds to the top-left corner. */
export interface Rectangle extends Rectangleish {
  type: "rectangle";
}

/** An ellipse is defined by its bounding rectangle's position and size. */
export interface Ellipse extends Entity, Size, CanHaveGraphics {
  type: "ellipse";
  /** Inner-to-outer radius ratio for ring shapes. 0 = solid, 1 = fully hollow. Default: 0. */
  innerRadius?: NumberOrVariable;
  /** Arc start angle in degrees, counter-clockwise from the right. Default: 0. */
  startAngle?: NumberOrVariable;
  /** Arc length in degrees from startAngle. Positive = counter-clockwise, negative = clockwise. Range: -360 to 360. Default: 360 (full ellipse). */
  sweepAngle?: NumberOrVariable;
}

/** A line is defined by its bounding rectangle's position and size. */
export interface Line extends Entity, Size, CanHaveGraphics {
  type: "line";
}

/** A regular polygon is defined by its bounding rectangle's position and size. */
export interface Polygon extends Entity, Size, CanHaveGraphics {
  type: "polygon";
  polygonCount?: NumberOrVariable;
  cornerRadius?: NumberOrVariable;
}

export interface Path extends Entity, Size, CanHaveGraphics {
  /** fillRule is used to determine which parts of the path are considered inside the shape to be filled. Default is 'nonzero'. */
  fillRule?: "nonzero" | "evenodd";
  /** SVG Path */
  geometry?: string;
  type: "path";
}

export interface TextStyle {
  fontFamily?: StringOrVariable;
  fontSize?: NumberOrVariable;
  fontWeight?: StringOrVariable;
  letterSpacing?: NumberOrVariable;
  fontStyle?: StringOrVariable;
  underline?: BooleanOrVariable;
  /** A multiplier that gets applied to the font size to determine spacing between lines. If not specified, uses the font's built-in line height. */
  lineHeight?: NumberOrVariable;
  textAlign?: "left" | "center" | "right" | "justify";
  textAlignVertical?: "top" | "middle" | "bottom";
  strikethrough?: BooleanOrVariable;
  href?: string;
}

export type TextContent = StringOrVariable | TextStyle[];

export interface Text extends Entity, Size, CanHaveGraphics, TextStyle {
  type: "text";
  content?: TextContent;
  /** textGrowth controls how the text box dimensions behave. It must be set before width or height can be used \u2014 without textGrowth, the width and height properties are ignored.
'auto': The text box automatically grows to fit the text content. Text does not wrap. Width and height adjust dynamically.
'fixed-width': The width is fixed and text wraps within it. The height grows automatically to fit the wrapped content.
'fixed-width-height': Both width and height are fixed. Text wraps and may be overflow if it exceeds the bounds.
IMPORTANT: Never set width or height without also setting textGrowth. If you want to control the size of a text box, you must set textGrowth first. */
  textGrowth?: "auto" | "fixed-width" | "fixed-width-height";
}

export interface CanHaveChildren {
  children?: Child[];
}

/** A frame is a rectangle that can have children. */
export interface Frame extends Rectangleish, CanHaveChildren, Layout {
  type: "frame";
  /** Visually clip content that overflows the frame bounds. Default is false. */
  clip?: BooleanOrVariable;
  placeholder?: boolean;
  /** If this property is set to an array, it indicates that this frame is a "slot" - which means that it is intended be customized with children in instances of the parent component. Each element of the array is an ID of a "recommended" reusable component, one which fits semantically as a child here (e.g. inside a menu bar, the content slot would recommend IDs of various menu item components). */
  slot?: false | string[];
}

export interface Group extends Entity, CanHaveChildren, CanHaveEffects, Layout {
  type: "group";
  width?: SizingBehavior;
  height?: SizingBehavior;
}

export interface Note extends Entity, Size, TextStyle {
  type: "note";
  content?: TextContent;
}

export interface Prompt extends Entity, Size, TextStyle {
  type: "prompt";
  content?: TextContent;
  model?: StringOrVariable;
}

export interface Context extends Entity, Size, TextStyle {
  type: "context";
  content?: TextContent;
}

/** Icon from a font */
export interface IconFont extends Entity, Size, CanHaveEffects {
  type: "icon_font";
  /** Name of the icon in the icon font */
  iconFontName?: StringOrVariable;
  /** Icon font to use. Valid fonts are 'lucide', 'feather', 'Material Symbols Outlined', 'Material Symbols Rounded', 'Material Symbols Sharp', 'phosphor' */
  iconFontFamily?: StringOrVariable;
  /** Variable font weight, only valid for icon fonts with variable weight. Values from 100 to 700. */
  weight?: NumberOrVariable;
  fill?: Fills;
}

/** References allow reusing other objects in different places. */
export interface Ref extends Entity {
  type: "ref";
  /** The \`ref\` property must be another object's ID. */
  ref: string;
  /** This can be used to customize the properties of descendant objects except the \`children\` property. */
  descendants?: {
    [
      key: string /** Each key is an ID path pointing to a descendant object. */
    ]: {} /** Descendant objects can be customized in two manners:
- Property overrides: only the customized properties are present with their new values. In this case, the \`id\`, \`type\` and \`children\` properties must not be specified!
- Object replacement: in this case, this object must be a completely new node tree, that will replace the original descendant of the referenced component. This is useful for adding custom content to instances of container-type components (cards, windows, panels, etc). */;
  };
  [key: string]: any;
}

export type Child =
  | Frame
  | Group
  | Rectangle
  | Ellipse
  | Line
  | Path
  | Polygon
  | Text
  | Note
  | Prompt
  | Context
  | IconFont
  | Ref;

export type IdPath = string;

export interface Document {
  version: "2.10";
  themes?: { [key: string /** RegEx: [^:]+ */]: string[] };
  imports?: {
    [
      key: string
    ]: string /** Each value is a relative URI of an imported .pen file, from which variables and reusable components are made available in the current file. The key is a short alias for the imported file. */;
  };
  variables?: {
    [key: string /** RegEx: [^:]+ */]:
      | {
          type: "boolean";
          value:
            | BooleanOrVariable
            | { value: BooleanOrVariable; theme?: Theme }[];
        }
      | {
          type: "color";
          value: ColorOrVariable | { value: ColorOrVariable; theme?: Theme }[];
        }
      | {
          type: "number";
          value:
            | NumberOrVariable
            | { value: NumberOrVariable; theme?: Theme }[];
        }
      | {
          type: "string";
          value:
            | StringOrVariable
            | { value: StringOrVariable; theme?: Theme }[];
        };
  };
  children: (
    | Frame
    | Group
    | Rectangle
    | Ellipse
    | Line
    | Polygon
    | Path
    | Text
    | Note
    | Context
    | Prompt
    | IconFont
    | Ref
  )[];
}

\`\`\``;

// src/websocket-request-router.ts
var import_path = __toESM(require("path"));

// src/operation-errors.ts
var OperationError = class _OperationError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "OperationError";
  }
  static fromError(error, defaultCode = "UNKNOWN_ERROR" /* UNKNOWN_ERROR */) {
    if (error instanceof _OperationError) {
      return error;
    }
    if (error instanceof Error) {
      return new _OperationError(defaultCode, error.message, { originalError: error.name });
    }
    return new _OperationError(defaultCode, String(error));
  }
  static resourceNotFound(resourcePath) {
    return new _OperationError(
      "RESOURCE_NOT_FOUND" /* RESOURCE_NOT_FOUND */,
      `Resource not found: ${resourcePath}`,
      { resourcePath }
    );
  }
  static ipcNotAvailable(resourcePath) {
    return new _OperationError(
      "IPC_NOT_AVAILABLE" /* IPC_NOT_AVAILABLE */,
      `Failed to access file ${resourcePath}. A file needs to be open in the editor to perform this action.`,
      { resourcePath }
    );
  }
  static invalidPayload(message, details) {
    return new _OperationError("INVALID_PAYLOAD" /* INVALID_PAYLOAD */, message, details);
  }
};

// src/handlers/ipc-request-handler.ts
var IPCRequestHandler = class {
  constructor(operationName) {
    this.operationName = operationName;
  }
  async handle(request, context) {
    const { filePath, ...params } = request.payload;
    const ipc = await context.getIPC(filePath || "");
    if (!ipc) {
      const error = OperationError.ipcNotAvailable(filePath || "");
      return {
        success: false,
        error: error.message
      };
    }
    try {
      const result = await ipc.request(this.operationName, params);
      return {
        success: result.success ?? true,
        result: result.success ? result.result : void 0,
        error: result.error
      };
    } catch (error) {
      const operationError = OperationError.fromError(error);
      return {
        success: false,
        error: operationError.message
      };
    }
  }
};

// src/constants.ts
var NEW_DOC_TYPES = [
  "new",
  "welcome",
  "welcome-desktop",
  "shadcn",
  "halo",
  "lunaris",
  "nitro",
  "demo"
];

// src/handlers/open-document-handler.ts
var OpenDocumentHandler = class {
  constructor() {
    this.operationName = "open-document";
  }
  async handle(request, context) {
    const { filePathOrTemplate } = request.payload;
    const targetPath = filePathOrTemplate || "new";
    if (!context.openDocument) {
      return { success: false, error: "openDocument not available" };
    }
    try {
      await context.openDocument(targetPath);
      if (context.waitForDocumentReady && !NEW_DOC_TYPES.includes(targetPath)) {
        await context.waitForDocumentReady(targetPath);
      }
      return { success: true, result: { message: "Document opened" } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to open document"
      };
    }
  }
};

// src/handlers/read-file-content-handler.ts
var ReadFileContentHandler = class {
  constructor() {
    this.operationName = "read-file-content";
  }
  async handle(request, context) {
    const { filePath } = request.payload;
    if (!filePath) {
      const error = OperationError.invalidPayload("File path is required");
      return {
        success: false,
        error: error.message
      };
    }
    try {
      const device = context.getDevice(filePath);
      if (!device) {
        const error = OperationError.resourceNotFound(filePath);
        return {
          success: false,
          error: error.message
        };
      }
      const content = device.getResourceContents();
      return {
        success: true,
        result: {
          content,
          filePath
        }
      };
    } catch (error) {
      const operationError = OperationError.fromError(error);
      return {
        success: false,
        error: operationError.message
      };
    }
  }
};

// src/handlers/operation-handler-factory.ts
var DefaultOperationHandlerFactory = class {
  constructor() {
    this.handlers = /* @__PURE__ */ new Map();
    this.handlers.set("read-file-content", new ReadFileContentHandler());
    this.handlers.set("open-document", new OpenDocumentHandler());
    this.handlers.set(
      "export-viewport",
      new IPCRequestHandler("export-viewport")
    );
  }
  createHandler(operationName) {
    return this.handlers.get(operationName) || new IPCRequestHandler(operationName);
  }
};

// src/websocket-request-router.ts
var WebSocketRequestRouter = class {
  constructor(wsServerManager, getIPC, deviceMap, getLastFocusedResource, logger, openDocument, waitForDocumentReady, handlerFactory) {
    this.wsServerManager = wsServerManager;
    this.getIPC = getIPC;
    this.deviceMap = deviceMap;
    this.getLastFocusedResource = getLastFocusedResource;
    this.logger = logger;
    this.openDocument = openDocument;
    this.waitForDocumentReady = waitForDocumentReady;
    this.handlerFactory = handlerFactory || new DefaultOperationHandlerFactory();
  }
  start() {
    this.wsServerManager.on("tool_request", async (req) => {
      await this.handleRequest(req);
    });
  }
  async handleRequest(req) {
    try {
      if (!req.request_id || !req.client_id) {
        this.logger.error("Invalid request: missing request_id or client_id");
        return;
      }
      const context = this.createContext();
      const handler = this.handlerFactory.createHandler(req.name);
      const result = await handler.handle(req, context);
      this.sendResponse(req, result);
      if (!result.success) {
        this.logger.error(`Failed to execute ${req.name}:`, result.error);
      }
    } catch (error) {
      this.sendErrorResponse(
        req,
        error instanceof Error ? error.message : "Unknown error"
      );
      this.logger.error(`Error handling request ${req.name}:`, error);
    }
  }
  createContext() {
    return {
      getIPC: (filePath) => this.getIPC(filePath),
      getDevice: (filePath) => this.findDevice(filePath),
      emit: (event, data) => this.wsServerManager.emit(event, data),
      getLastFocusedResource: () => this.getLastFocusedResource(),
      openDocument: this.openDocument,
      waitForDocumentReady: this.waitForDocumentReady
    };
  }
  findDevice(filePath) {
    if (this.deviceMap.has(filePath)) {
      return this.deviceMap.get(filePath);
    }
    const resolvedPath = import_path.default.resolve(filePath);
    if (this.deviceMap.has(resolvedPath)) {
      return this.deviceMap.get(resolvedPath);
    }
    for (const [resourcePath, device] of this.deviceMap) {
      if (resourcePath === filePath || import_path.default.resolve(resourcePath) === resolvedPath) {
        return device;
      }
    }
    return void 0;
  }
  sendResponse(req, result) {
    this.wsServerManager.sendResponse({
      client_id: req.client_id,
      request_id: req.request_id,
      success: result.success,
      result: result.result,
      error: result.error
    });
  }
  sendErrorResponse(req, error) {
    this.wsServerManager.sendResponse({
      client_id: req.client_id,
      request_id: req.request_id,
      success: false,
      error
    });
  }
};

// src/ipc-device-manager.ts
var import_node_url = require("url");
var unique = (arr) => [...new Set(arr)];
var readOptionalFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return void 0;
  }
};
var getRules = () => {
  const rulesRoot = process.env.PENCIL_EDITOR_ROOT ? path2.resolve(process.env.PENCIL_EDITOR_ROOT) : void 0;
  const generalFromFile = rulesRoot ? readOptionalFile(
    path2.join(rulesRoot, "src/tool-handlers/rules/general.md")
  ) : void 0;
  const designFromFile = rulesRoot ? readOptionalFile(path2.join(rulesRoot, "src/tool-handlers/rules/design.md")) : void 0;
  return {
    generalRules: process.env.PENCIL_GENERAL_RULES ?? generalFromFile ?? "",
    designRules: process.env.PENCIL_DESIGN_RULES ?? designFromFile ?? ""
  };
};
var IPCDeviceManager = class {
  constructor(wsServerManager, logger, appFolderPath, mcpAppName, onOpenDocument, openDocument) {
    this.wsServerManager = wsServerManager;
    this.logger = logger;
    this.appFolderPath = appFolderPath;
    this.mcpAppName = mcpAppName;
    this.onOpenDocument = onOpenDocument;
    this.openDocument = openDocument;
    this.ipcMap = /* @__PURE__ */ new Map();
    this.deviceMap = /* @__PURE__ */ new Map();
    this.initializedDocuments = /* @__PURE__ */ new Set();
    this.pendingDocuments = /* @__PURE__ */ new Map();
    this.pencilAgents = /* @__PURE__ */ new Map();
    this.deviceConversations = /* @__PURE__ */ new Map();
  }
  setWorkspaces(dirs) {
    this.workspaces = dirs;
  }
  waitForDocumentReady(filePath, timeoutMs = 15e3) {
    let resolvedPath;
    if (path2.isAbsolute(filePath)) {
      try {
        if (fs.statSync(filePath).isFile()) {
          resolvedPath = filePath;
        }
      } catch {
      }
    } else {
      for (const workspaceDir of this.workspaces || []) {
        const candidatePath = path2.join(workspaceDir, filePath);
        try {
          if (fs.statSync(candidatePath).isFile()) {
            resolvedPath = candidatePath;
            break;
          }
        } catch {
          continue;
        }
      }
    }
    if (!resolvedPath) {
      return Promise.resolve();
    }
    if (this.initializedDocuments.has(resolvedPath)) {
      return Promise.resolve();
    }
    return new Promise((resolve2, reject) => {
      const timeout = setTimeout(() => {
        this.pendingDocuments.delete(resolvedPath);
        reject(new Error(`Timeout waiting for document: ${resolvedPath}`));
      }, timeoutMs);
      this.pendingDocuments.set(resolvedPath, { resolve: resolve2, reject, timeout });
    });
  }
  addResource(ipc, device) {
    this.logger.info("addResource:", device.getResourcePath());
    const resourcePath = device.getResourcePath();
    this.ipcMap.set(resourcePath, ipc);
    this.deviceMap.set(resourcePath, device);
    ipc.handle(
      "get-session",
      async () => {
        this.logger.info("[IPC] get-session");
        return device.getSession();
      }
    );
    ipc.on(
      "set-session",
      ({ email, token }) => {
        this.logger.info("[IPC] set-session", email);
        device.setSession(email, token);
      }
    );
    ipc.handle("get-last-online-at", async () => {
      return { timestamp: device.getLastOnlineAt() };
    });
    ipc.on("set-last-online-at", ({ timestamp }) => {
      device.setLastOnlineAt(timestamp);
    });
    ipc.handle("get-device-id", async () => {
      this.logger.info("[IPC] get-device-id");
      return {
        deviceId: device.getDeviceId()
      };
    });
    ipc.handle(
      "read-file",
      async (fileURI) => {
        this.logger.info("[IPC] read-file", fileURI);
        const filePath = fileURI.startsWith("file:") ? (0, import_node_url.fileURLToPath)(fileURI) : fileURI;
        const data = await device.readFile(filePath);
        if (data.length === data.buffer.byteLength) {
          return data.buffer;
        } else {
          return data.buffer.slice(
            data.byteOffset,
            data.byteOffset + data.byteLength
          );
        }
      }
    );
    ipc.handle(
      "save-generated-image",
      async ({ image }) => {
        this.logger.info("[IPC] save-generated-image");
        const resourceDir = await device.getResourceFolderPath();
        const imagesDir = path2.join(resourceDir, "images");
        await device.ensureDir(imagesDir);
        const buffer = Buffer.from(image, "base64");
        const filename = `generated-${Date.now()}.png`;
        const imageFilePath = path2.join(imagesDir, filename);
        await device.writeFile(imageFilePath, new Uint8Array(buffer));
        const relativePath = `./images/${filename}`;
        return { relativePath };
      }
    );
    ipc.handle("save-temp-file", async ({ base64Data, ext, name }) => {
      const filePath = await device.saveTempFile(base64Data, ext, name);
      return { path: filePath };
    });
    ipc.on("cleanup-temp-files", async ({ paths }) => {
      await device.cleanupTempFiles(paths);
    });
    ipc.on("initialized", () => {
      this.logger.info("[IPC] initialized:", resourcePath);
      this.initializedDocuments.add(resourcePath);
      ipc.notify("file-update", {
        content: device.getResourceContents(),
        fileURI: device.getResourcePath().startsWith("pencil:") ? device.getResourcePath() : (0, import_node_url.pathToFileURL)(device.getResourcePath()).toString(),
        isDirty: device.getIsDirty(),
        zoomToFit: true
      });
      ipc.notify("color-theme-changed", {
        theme: device.getActiveThemeKind()
      });
      const pending = this.pendingDocuments.get(resourcePath);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve();
        this.pendingDocuments.delete(resourcePath);
      }
    });
    ipc.on("file-changed", () => {
      this.logger.info("[IPC] file-changed");
      device.fileChanged();
    });
    ipc.handle("import-file", async ({ fileName, fileContents }) => {
      this.logger.info("[IPC] import-file", fileName);
      if (device.isTemporary() && path2.isAbsolute(fileName)) {
        return { filePath: fileName };
      }
      return device.importFileByName(fileName, fileContents);
    });
    ipc.handle("import-files", async (files) => {
      this.logger.info(
        "[IPC] import-files",
        files.map((f) => f.fileName).join(", ")
      );
      return device.importFiles(files);
    });
    ipc.handle("import-uri", async ({ uri }) => {
      this.logger.info("[IPC] import-uri", uri);
      return device.importFileByUri(uri);
    });
    ipc.on(
      "send-prompt",
      async ({
        prompt,
        modelID,
        conversationId,
        sessionId,
        files,
        subagent,
        agentMultiplier,
        userMessageExtension,
        dangerouslySkipPermissions
      }) => {
        this.logger.info(
          "[IPC] send-prompt",
          prompt,
          modelID,
          conversationId,
          sessionId,
          files ? `(${files.length} files)` : "(no files)"
        );
        const agentType = (0, import_shared.getAgentTypeFromModelID)(modelID);
        const agent = await this.invokeAgent({
          prompt,
          device,
          modelID,
          agentType,
          conversationId,
          sessionId,
          files,
          subagent,
          agentMultiplier,
          userMessageExtension,
          dangerouslySkipPermissions
        });
        this.pencilAgents.set(conversationId, agent);
        this.deviceConversations.set(resourcePath, [
          ...this.deviceConversations.get(resourcePath) || [],
          conversationId
        ]);
      }
    );
    ipc.handle(
      "agent-stop",
      async ({ conversationId }) => {
        this.logger.info("[IPC] agent-stop", { conversationId });
        const agent = this.pencilAgents.get(conversationId);
        if (agent) {
          await agent.stop();
        }
      }
    );
    ipc.on("open-document", async (type) => {
      this.logger.info("[IPC] open-document", type);
      return device.openDocument(type);
    });
    ipc.on("submit-prompt", async ({ prompt, model, files }) => {
      this.logger.info("[IPC] submit-prompt", prompt, model);
      await device.submitPrompt(prompt, model, void 0, files);
    });
    ipc.on("toggle-design-mode", () => {
      this.logger.info("[IPC] toggle-design-mode");
      device.toggleDesignMode();
    });
    ipc.on("set-left-sidebar-visible", ({ visible }) => {
      this.logger.info("[IPC] set-left-sidebar-visible");
      device.setLeftSidebarVisible(visible);
    });
    ipc.on("sign-out", () => {
      device.signOut();
      ipc.notify("did-sign-out");
    });
    ipc.on("open-external-url", ({ url }) => {
      device.openExternalUrl(url);
    });
    ipc.on("chat-question-response", ({ conversationId, toolUseId, output }) => {
      this.logger.info(
        `[IPC] chat-question-response: toolUseId=${toolUseId} for conversation=${conversationId}`
      );
      this.logger.info(
        `[IPC] Question answers: ${JSON.stringify(output.answers)}`
      );
      const answerEntries = Object.entries(output.answers);
      let answerText;
      if (answerEntries.length === 1) {
        answerText = answerEntries[0][1];
      } else {
        answerText = answerEntries.map(([question, answer]) => `${question}: ${answer}`).join("\n");
      }
      if (answerText) {
        ipc.notify("chat-question-answered", {
          conversationId,
          userResponse: answerText,
          toolUseId
        });
      }
    });
    ipc.on(
      "load-file",
      ({ filePath }) => {
        if (filePath.startsWith("file:")) {
          filePath = (0, import_node_url.fileURLToPath)(filePath);
        }
        device.loadFile(filePath);
      }
    );
    ipc.handle("find-libraries", async () => (await device.findLibraries()).map((path3) => (0, import_node_url.pathToFileURL)(path3).toString()));
    ipc.on("turn-into-library", async () => {
      this.logger.info("[IPC] turn-into-library");
      await device.turnIntoLibrary();
    });
    ipc.handle(
      "browse-libraries",
      async ({ multiple }) => (await device.browseLibraries(multiple))?.map((path3) => (0, import_node_url.pathToFileURL)(path3).toString())
    );
  }
  async stopAllAgents() {
    this.logger.info("stopAllAgents()");
    for (const [, agent] of this.pencilAgents) {
      await agent.stop();
    }
  }
  async invokeAgent(obj) {
    const {
      prompt,
      device,
      modelID,
      agentType,
      conversationId,
      sessionId,
      files,
      disallowedTools,
      subagent,
      agentMultiplier,
      userMessageExtension,
      dangerouslySkipPermissions
    } = obj;
    const ipc = this.ipcMap.get(device.getResourcePath());
    if (!ipc) {
      throw new Error(
        `IPC not found for resource: ${device.getResourcePath()}`
      );
    }
    this.logger.info(
      `[IPC] invokeAgent with conversationId: ${conversationId}, sessionId: ${sessionId}`
    );
    const enableSpawnAgents = agentMultiplier !== void 0 && agentMultiplier > 1;
    const disallowedToolsBySubagent = subagent ? ["get_editor_state", "set_variables", "spawn_agents"] : [];
    const { prompt: finalPrompt, files: promptFiles } = await getUserPrompt(
      ipc,
      prompt,
      files,
      agentMultiplier,
      userMessageExtension
    );
    const finalDisallowedTools = [
      ...disallowedTools || [],
      ...disallowedToolsBySubagent,
      ...!enableSpawnAgents ? ["spawn_agents"] : [],
      // https://code.claude.com/docs/en/tools-reference
      ...agentType === "claude" ? ["Skill", "Agent"] : [],
      "open_document"
    ];
    const pencilMcpServer = (0, import_mcp.getMcpConfiguration)({
      folderPath: this.appFolderPath,
      appName: this.mcpAppName,
      conversationId,
      enableSpawnAgents
    });
    const agentConfig = {
      logger: this.logger,
      filePath: device.getResourcePath(),
      model: modelID,
      sessionId,
      // Pass session ID for resume
      mcpServers: [pencilMcpServer],
      packagePath: device.getAgentPackagePath(agentType),
      execPath: device.execPath(),
      env: device.getAgentEnv(),
      includePartialMessages: device.agentIncludePartialMessages(),
      systemPrompt: await getAgentSystemPrompt(ipc),
      apiKey: device.getAgentApiKey(agentType),
      cwd: await device.getWorkspaceFolderPath(),
      disallowedTools: unique(finalDisallowedTools),
      dangerouslySkipPermissions
    };
    const agent = (0, import_agent.createAgent)(agentType, agentConfig);
    agent.on("chat-session", (event) => {
      ipc.notify("chat-session", { conversationId, ...event });
    });
    agent.on("chat-agent-message", (event) => {
      ipc.notify("chat-agent-message", { conversationId, ...event });
    });
    agent.on("chat-tool-use", (event) => {
      ipc.notify("chat-tool-use", { conversationId, ...event });
    });
    agent.on("chat-tool-result", (event) => {
      ipc.notify("chat-tool-result", { conversationId, ...event });
    });
    agent.on("tool-use-start", (toolUse) => {
      ipc.notify("chat-tool-use-start", {
        conversationId,
        toolName: toolUse.name,
        toolUseId: toolUse.id
      });
    });
    agent.on("batch-design", (toolCall) => {
      ipc.request("batch-design", { ...toolCall, conversationId });
    });
    agent.on("spawn-agents", (toolCall) => {
      ipc.request("spawn-agents", { ...toolCall, conversationId });
    });
    agent.on("thinking-update", (message) => {
      ipc.notify("thinking-update", { ...message, conversationId });
    });
    agent.on("permission-request", async (event) => {
      try {
        const { result } = await ipc.request(
          "permission-request",
          {
            conversationId,
            toolName: event.toolName,
            input: event.input
          },
          -1
        );
        event.resolve(result);
      } catch {
        event.resolve("deny");
      }
    });
    agent.on("completed", (payload) => {
      ipc.notify("chat-assistant-final", {
        conversationId,
        fullText: payload.response,
        agentError: payload.error
      });
      this.pencilAgents.delete(conversationId);
    });
    agent.on("failed", (payload) => {
      ipc.notify("chat-error", {
        conversationId,
        message: payload.message || "Agent execution failed",
        error: payload.error
      });
      this.pencilAgents.delete(conversationId);
    });
    agent.on("stopped", () => {
      this.pencilAgents.delete(conversationId);
    });
    agent.execute(finalPrompt, promptFiles);
    return agent;
  }
  async removeResource(resourcePath) {
    this.logger.info("removeResource:", resourcePath);
    const ipc = this.ipcMap.get(resourcePath);
    if (ipc) {
      this.ipcMap.delete(resourcePath);
      ipc.dispose();
    }
    const conversationIds = this.deviceConversations.get(resourcePath) || [];
    for (const conversationId of conversationIds) {
      const agent = this.pencilAgents.get(conversationId);
      if (agent) {
        await agent.stop();
        this.pencilAgents.delete(conversationId);
      }
    }
    this.deviceConversations.delete(resourcePath);
    this.deviceMap.get(resourcePath)?.dispose();
    this.deviceMap.delete(resourcePath);
    this.initializedDocuments.delete(resourcePath);
  }
  notifyAll(event, payload) {
    for (const [_name, ipc] of this.ipcMap) {
      ipc.notify(event, payload);
    }
  }
  proxyMcpToolCallRequests() {
    this.requestRouter = new WebSocketRequestRouter(
      this.wsServerManager,
      (filePath) => this.getIPC(filePath),
      this.deviceMap,
      () => this.lastFocusedResource || null,
      this.logger,
      this.openDocument,
      (filePath, timeoutMs) => this.waitForDocumentReady(filePath, timeoutMs)
    );
    this.requestRouter.start();
  }
  updateLastResource(lastFocusedResource) {
    this.lastFocusedResource = lastFocusedResource;
  }
  getResourceDevice(resourcePath) {
    return this.deviceMap.get(resourcePath);
  }
  getFocusedResource() {
    if (this.lastFocusedResource) {
      return this.deviceMap.get(this.lastFocusedResource);
    }
    return void 0;
  }
  getFocusedResourceAndIPC() {
    if (this.lastFocusedResource) {
      const device = this.deviceMap.get(this.lastFocusedResource);
      const ipc = this.ipcMap.get(this.lastFocusedResource);
      return { device, ipc };
    }
    return { device: void 0, ipc: void 0 };
  }
  async getIPC(resourcePath) {
    if (this.ipcMap.has(resourcePath)) {
      return this.ipcMap.get(resourcePath);
    }
    let absoluteResourcePath;
    if (!path2.isAbsolute(resourcePath)) {
      for (const workspaceDir of this.workspaces || []) {
        const joinedFilePath = path2.join(workspaceDir, resourcePath);
        const fileStat = fs.statSync(joinedFilePath);
        if (fileStat.isFile()) {
          absoluteResourcePath = joinedFilePath;
        }
      }
    }
    if (absoluteResourcePath) {
      if (this.ipcMap.has(absoluteResourcePath)) {
        return this.ipcMap.get(absoluteResourcePath);
      }
      if (this.onOpenDocument) {
        await this.onOpenDocument(absoluteResourcePath);
        if (this.ipcMap.has(absoluteResourcePath)) {
          return this.ipcMap.get(absoluteResourcePath);
        }
      }
    }
    if (this.lastFocusedResource) {
      return this.ipcMap.get(this.lastFocusedResource);
    }
    return void 0;
  }
};
async function getAgentSystemPrompt(ipc) {
  const { generalRules, designRules } = getRules();
  let general = `${generated_schema_default}

${generalRules}

${designRules}`;
  const guidelines = await ipc.request("get-guidelines", {});
  if (guidelines.success) {
    general += `

# Available Guidelines

${guidelines.result.message}`;
  }
  return general;
}
async function getUserPrompt(ipc, prompt, files, agentMultiplier, userMessageExtension) {
  let finalPrompt = prompt;
  const enableSpawnAgents = agentMultiplier !== void 0 && agentMultiplier > 1;
  if (enableSpawnAgents) {
    finalPrompt = getPromptWithMultiplier(finalPrompt, agentMultiplier);
  }
  if (userMessageExtension) {
    finalPrompt += `

We already started examining the target node and the overall document structure to understand what we are working with so we can start designing immediately:

${userMessageExtension}`;
  }
  const editorState = await ipc.request("get-editor-state");
  if (editorState.success) {
    finalPrompt += `

# The result of \`get-editor-state\` tool call:

${editorState.result.message}

Calling \`get-editor-state\` in the beginning is not needed.`;
  }
  return { prompt: finalPrompt, files };
}
function getPromptWithMultiplier(prompt, agentMultiplier) {
  return `Do the following task by splitting the work in parallel if needed to MAXIMUM ${agentMultiplier - 1} extra designer agents using the \`spawn_agents\` tool besides the currently running agent. This session should be dedicated and continue to design the last part of the split work:

${prompt}

After you called \`spawn_agents\` tool, continue with the last part of the split work.`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  IPCDeviceManager,
  NEW_DOC_TYPES,
  WebSocketRequestRouter
});
