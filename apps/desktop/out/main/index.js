"use strict";
const fs = require("node:fs");
const path = require("node:path");
const electron = require("electron");
const shared = require("@ha/shared");
const ElectronStore = require("electron-store");
const mcp = require("@ha/mcp");
const os = require("node:os");
const log = require("electron-log");
const node_child_process = require("node:child_process");
const node_url = require("node:url");
const ipc = require("@ha/ipc");
const wsServer = require("@ha/ws-server");
const crypto = require("node:crypto");
const fsPromise = require("node:fs/promises");
const EventEmitter = require("eventemitter3");
const Sentry = require("@sentry/electron/main");
const electronUpdater = require("electron-updater");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const os__namespace = /* @__PURE__ */ _interopNamespaceDefault(os);
const crypto__namespace = /* @__PURE__ */ _interopNamespaceDefault(crypto);
const fsPromise__namespace = /* @__PURE__ */ _interopNamespaceDefault(fsPromise);
const Sentry__namespace = /* @__PURE__ */ _interopNamespaceDefault(Sentry);
const IS_DEV = process.env.NODE_ENV === "development";
const APP_PROTOCOL = "pencil";
const EDITOR_PORT = process.env.EDITOR_PORT || "3000";
const WS_PORT = process.env.WS_PORT ? Number.parseInt(process.env.WS_PORT, 10) : void 0;
const APP_FOLDER_PATH = electron.app.isPackaged ? path.resolve(__dirname, "..", "..", "app.asar.unpacked") : path.resolve(__dirname, "..");
const IS_MAC = process.platform === "darwin";
process.env.INTERNAL_PENCIL_EVAL_FOLDER;
const CONFIG_FOLDER = path.join(os.homedir(), ".pencil");
class DesktopLogger {
  setLevel(_level) {
  }
  setEnabled(_enabled) {
  }
  debug(...args) {
    log.debug(...args);
  }
  info(...args) {
    log.info(...args);
  }
  warn(...args) {
    log.warn(...args);
  }
  error(...args) {
    log.error(...args);
  }
}
const logger = new DesktopLogger();
class DesktopMCPAdapter {
  constructor(appPath) {
    this.appPath = appPath;
    this.log = logger;
  }
  getInstallationPath() {
    return this.appPath;
  }
  getExternalExtensionPath(_extensionId) {
    return void 0;
  }
  getAppPath() {
    return electron.app.getPath("appData");
  }
  getAppName() {
    return "desktop";
  }
  static getSupportedIntegrations() {
    return [
      "claudeCodeCLI",
      "codexCLI",
      "geminiCLI",
      "openCodeCLI",
      "kiroCLI",
      "claudeDesktop"
    ];
  }
  async setupIntegrations(enabledIntegrations) {
    const supportedIntegrations = DesktopMCPAdapter.getSupportedIntegrations();
    if (!enabledIntegrations) {
      enabledIntegrations = supportedIntegrations;
    }
    await mcp.removeIntegrations(this, supportedIntegrations);
    const activeIntegrations = await mcp.activateIntegrations(this, enabledIntegrations);
    desktopConfig.set("enabledIntegrations", activeIntegrations);
  }
  async saveMCPAppInfo(content) {
    try {
      const filePath = path.join(CONFIG_FOLDER, "apps", this.getAppName());
      if (!fs.existsSync(filePath)) {
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      }
      await fs.promises.writeFile(filePath, content, "utf8");
      return true;
    } catch (err) {
      this.log.error(`failed to save MCP host info: ${String(err)}`);
    }
    return false;
  }
  async toggleIntegration(integration, state) {
    const supportedIntegrations = DesktopMCPAdapter.getSupportedIntegrations();
    if (!supportedIntegrations.includes(integration)) {
      logger.warn(`cannot enable unsupported integration: ${integration}`);
      return;
    }
    let enabledIntegrations = desktopConfig.get("enabledIntegrations");
    if (state) {
      if (!enabledIntegrations.includes(integration)) {
        enabledIntegrations.push(integration);
      }
    } else {
      enabledIntegrations = enabledIntegrations.filter((i) => i !== integration);
    }
    await this.setupIntegrations(enabledIntegrations);
  }
}
const defaults = {
  windowBounds: {
    width: 1200,
    height: 800,
    x: void 0,
    y: void 0
  },
  recentFiles: [],
  claudeApiKey: void 0,
  claudeLoginType: "subscription",
  enabledIntegrations: DesktopMCPAdapter.getSupportedIntegrations(),
  codexApiKey: void 0,
  codexLoginType: "subscription",
  workspaceFolders: {},
  installOnAppQuit: void 0
};
const Store = typeof ElectronStore === "function" ? ElectronStore : ElectronStore.default;
const store = new Store({ defaults });
class DesktopConfig {
  constructor(store2) {
    this.store = store2;
  }
  handleMalformedStore(error) {
    const errorName = error instanceof Error ? error.name : String(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof SyntaxError || errorName === "SyntaxError" || errorMessage.toLowerCase().includes("expected")) {
      this.store.clear();
      return true;
    }
    return false;
  }
  get(key) {
    try {
      return this.store.get(key);
    } catch (error) {
      if (this.handleMalformedStore(error)) {
        return defaults[key];
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes("eperm")) {
        return defaults[key];
      }
      throw error;
    }
  }
  delete(key) {
    try {
      this.store.delete(key);
    } catch (error) {
      if (this.handleMalformedStore(error)) {
        return;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes("eperm")) {
        return;
      }
      throw error;
    }
  }
  set(key, value) {
    try {
      this.store.set(key, value);
    } catch (error) {
      if (this.handleMalformedStore(error)) {
        this.store.set(key, value);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes("eperm")) {
        return;
      }
      if (errorMessage.toLowerCase().includes("enospc")) {
        return;
      }
      throw error;
    }
  }
}
const desktopConfig = new DesktopConfig(store);
const EXTENSION_TO_MEDIA_TYPE = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp"
};
function resolveAttachments(attachments, basePath) {
  const result = [];
  for (const attachment of attachments) {
    const resolvedPath = path.isAbsolute(attachment) ? attachment : path.resolve(basePath, attachment);
    if (!fs.existsSync(resolvedPath)) {
      logger.warn(`Attachment file does not exist: ${resolvedPath}, skipping.`);
      continue;
    }
    const ext = path.extname(resolvedPath).toLowerCase();
    const name = path.basename(resolvedPath);
    if (ext in EXTENSION_TO_MEDIA_TYPE) {
      const data = fs.readFileSync(resolvedPath).toString("base64");
      result.push({
        type: "image",
        name,
        source: {
          data,
          media_type: EXTENSION_TO_MEDIA_TYPE[ext],
          type: "base64"
        }
      });
    } else {
      const content = fs.readFileSync(resolvedPath, "utf-8");
      result.push({
        type: "text",
        name,
        content
      });
    }
  }
  return result;
}
function parseAgentExecuteConfig(configString) {
  try {
    return JSON.parse(configString);
  } catch {
    try {
      const filePath = path.isAbsolute(configString) ? configString : path.resolve(process.cwd(), configString);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(fileContent);
    } catch {
      return void 0;
    }
  }
}
async function openWithAgentExecuteConfig(ipcDeviceManager, loadFile, config) {
  for (const c of config) {
    const filePath = path.isAbsolute(c.file) ? c.file : path.resolve(process.cwd(), c.file);
    if (!fs.existsSync(filePath)) {
      logger.warn(`File does not exist: ${filePath}, skipping.`);
      continue;
    }
    await loadFile(filePath, true);
    await ipcDeviceManager.waitForDocumentReady(filePath);
    const ipc2 = await ipcDeviceManager.getIPC(filePath);
    if (!ipc2) {
      logger.warn(`Failed to get IPC for file: ${filePath}`);
      continue;
    }
    const loginType = desktopConfig.get("claudeLoginType");
    if (loginType === void 0) {
      logger.warn("Cannot prompt agent: Claude login type is not set.");
    }
    const files = c.attachments && c.attachments.length > 0 ? resolveAttachments(c.attachments, process.cwd()) : void 0;
    ipc2.notify("prompt-agent", {
      prompt: c.prompt,
      modelID: loginType ? shared.mapCanvasModelsToThirdParty("claude", loginType, c.model) : void 0,
      files
    });
  }
}
class AgentConfigManager {
  constructor(ipcDeviceManager) {
    this.ipcDeviceManager = ipcDeviceManager;
  }
  get() {
    logger.debug("AgentConfigManager.get()");
    const claudeLogin = desktopConfig.get("claudeLoginType");
    const codexLogin = desktopConfig.get("codexLoginType");
    const claudeModels = shared.getSupportedModels("claude", claudeLogin);
    const codexModels = shared.getSupportedModels("codex", codexLogin);
    return {
      claude: {
        loginType: desktopConfig.get("claudeLoginType"),
        apiKeyStored: Boolean(desktopConfig.get("claudeApiKey")),
        defaultModel: shared.getDefaultModel("claude", claudeLogin),
        supportedModels: claudeModels
      },
      codex: {
        loginType: desktopConfig.get("codexLoginType"),
        apiKeyStored: Boolean(desktopConfig.get("codexApiKey")),
        defaultModel: shared.getDefaultModel("codex", codexLogin),
        supportedModels: codexModels
      },
      allSupportedModels: [...claudeModels, ...codexModels]
    };
  }
  set(agentType, loginType, apiKey) {
    logger.debug("AgentConfigManager.set()", agentType, loginType, Boolean(apiKey));
    if (agentType === "claude") {
      desktopConfig.set("claudeLoginType", loginType);
      if (apiKey) {
        desktopConfig.set("claudeApiKey", apiKey);
      }
    } else if (agentType === "codex") {
      desktopConfig.set("codexLoginType", loginType);
      if (apiKey) {
        desktopConfig.set("codexApiKey", apiKey);
      }
    }
    this.notify();
  }
  notify() {
    const agentConfig = this.get();
    logger.debug("AgentConfigManager.notify()");
    this.ipcDeviceManager.notifyAll("agent-config-changed", agentConfig);
  }
}
function getClaudeCodePackagePath() {
  if (!electron.app.isPackaged) {
    return void 0;
  }
  if (os.platform() === "win32") {
    return path.join(CONFIG_FOLDER);
  }
  const appPath = electron.app.getAppPath();
  const asarUnpackedPath = appPath.replace(/\.asar$/, ".asar.unpacked");
  return path.join(
    asarUnpackedPath,
    "node_modules",
    "@anthropic-ai",
    "claude-agent-sdk"
  );
}
async function setupClaudeCodeResources() {
  if (!electron.app.isPackaged) {
    return;
  }
  if (os.platform() !== "win32") {
    return;
  }
  const appPath = electron.app.getAppPath();
  const asarUnpackedPath = appPath.replace(/\.asar$/, ".asar.unpacked");
  const cliFile = path.join(
    asarUnpackedPath,
    "node_modules",
    "@anthropic-ai",
    "claude-agent-sdk",
    "cli.js"
  );
  try {
    fs.mkdirSync(CONFIG_FOLDER, { recursive: true });
    await fs.promises.cp(cliFile, path.join(CONFIG_FOLDER, "cli.js"));
  } catch {
  }
}
function getClaudeCodeEnv() {
  const loginType = desktopConfig.get("claudeLoginType");
  const baseEnv = {
    ...process.env,
    ANTHROPIC_BETAS: "fine-grained-tool-streaming-2025-05-14"
  };
  const customFlags = {};
  switch (loginType) {
    case "api-key":
      customFlags.ANTHROPIC_API_KEY = desktopConfig.get("claudeApiKey");
      break;
    case "aws-bedrock":
      customFlags.CLAUDE_CODE_USE_BEDROCK = "1";
      break;
    case "google-vertex":
      customFlags.CLAUDE_CODE_USE_VERTEX = "1";
      break;
    case "microsoft-foundry":
      customFlags.CLAUDE_CODE_USE_FOUNDRY = "1";
      break;
  }
  return { ...baseEnv, ...customFlags };
}
function getClaudeExecPath() {
  if (!electron.app.isPackaged) {
    return void 0;
  }
  const plat = os.platform();
  return path.join(
    APP_FOLDER_PATH,
    "out",
    "assets",
    `bun-${plat}-${os.arch()}${plat === "win32" ? ".exe" : ""}`
  );
}
function getCodexPackagePath() {
  if (!electron.app.isPackaged) {
    return void 0;
  }
  const appPath = electron.app.getAppPath();
  const asarUnpackedPath = appPath.replace(/\.asar$/, ".asar.unpacked");
  return path.join(asarUnpackedPath, "node_modules", "@openai", "codex-sdk");
}
function getFilePathForPencilURI(uri) {
  return path.join(
    electron.app.getAppPath(),
    "out",
    "data",
    uri.substring("pencil:".length)
  );
}
const sessionFilePath = path__namespace.join(CONFIG_FOLDER, `session-desktop${IS_DEV ? "-dev" : ""}.json`);
const legacyLicenseFilePath = path__namespace.join(
  CONFIG_FOLDER,
  `license-token${IS_DEV ? "-dev" : ""}.json`
);
function sha1Hex(input) {
  const maybeHash = crypto__namespace.hash;
  if (typeof maybeHash === "function") {
    return maybeHash("sha1", input);
  }
  return crypto__namespace.createHash("sha1").update(input).digest("hex");
}
class DesktopResourceDevice extends EventEmitter {
  constructor(filePath, fileContent, isDirty, onSave) {
    super();
    this.onSave = onSave;
    this.id = crypto__namespace.randomUUID();
    this.isDirty = false;
    this.ignoreDirtyOnClose = false;
    this.initialized = false;
    this.hasThrottledBackupSave = false;
    this.filePath = filePath;
    this.fileContent = fileContent;
    this.isDirty = isDirty;
    const windowBounds = desktopConfig.get("windowBounds");
    const isMac = process.platform === "darwin";
    const isDark = electron.nativeTheme.shouldUseDarkColors;
    const newWindow = new electron.BrowserWindow({
      width: windowBounds.width,
      height: windowBounds.height,
      x: windowBounds.x,
      y: windowBounds.y,
      frame: !isMac,
      transparent: isMac,
      ...isMac ? {
        titleBarStyle: "hiddenInset",
        vibrancy: "under-window",
        trafficLightPosition: { x: 14, y: 14 }
      } : {},
      ...!isMac ? { backgroundColor: isDark ? "#2e2d2d" : "#e8e8e8" } : {},
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path__namespace.join(__dirname, "..", "preload", "index.js")
      }
    });
    newWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        electron.shell.openExternal(url);
        return { action: "deny" };
      }
      return { action: "allow" };
    });
    newWindow.on("close", async (event) => {
      const isLoggedIn = Boolean(this.getSession()?.token);
      if (!this.ignoreDirtyOnClose && isLoggedIn && this.getIsDirty()) {
        event.preventDefault();
        const cancelled = await this.saveResource({
          userAction: false
        });
        if (cancelled) {
          return;
        }
        this.ignoreDirtyOnClose = true;
        if (!newWindow?.isDestroyed()) {
          newWindow?.close();
        }
        return;
      }
      this.ignoreDirtyOnClose = false;
    });
    newWindow.on("resized", () => {
      if (newWindow?.isDestroyed()) {
        return;
      }
      const bounds = newWindow?.getBounds();
      if (!bounds) {
        return;
      }
      desktopConfig.set("windowBounds", bounds);
    });
    newWindow.on("closed", async () => {
      this.emit("window-closed");
    });
    newWindow.on("focus", () => {
      this.emit("window-focused");
    });
    newWindow.on("enter-full-screen", () => {
      this.emit("window-fullscreen-changed", true);
    });
    newWindow.on("leave-full-screen", () => {
      this.emit("window-fullscreen-changed", false);
    });
    if (!newWindow.isDestroyed() && !newWindow.webContents.isDestroyed()) {
      newWindow.webContents.on("did-finish-load", async () => {
        if (!this.initialized) {
          this.initialized = true;
        }
        this.emit("window-load-finished", this.initialized);
      });
    }
    this.window = newWindow;
  }
  get backupFilePath() {
    return this.filePath.startsWith("pencil:") ? void 0 : backupFilePath(this.filePath);
  }
  getWindow() {
    return this.window;
  }
  focusWindow() {
    if (this.window.isDestroyed()) {
      return;
    }
    if (this.window.isMinimized()) {
      this.window.restore();
    }
    this.window.focus();
  }
  getResourcePath() {
    return this.filePath;
  }
  getResourceContents() {
    return this.fileContent;
  }
  getDeviceId() {
    const machineId = os__namespace.hostname() + os__namespace.platform() + os__namespace.arch();
    return crypto__namespace.createHash("md5").update(machineId).digest("hex");
  }
  getIsDirty() {
    return this.isDirty;
  }
  readSessionFile() {
    try {
      return JSON.parse(fs__namespace.readFileSync(sessionFilePath, "utf8"));
    } catch {
      return void 0;
    }
  }
  writeSessionFile(data) {
    try {
      fs__namespace.mkdirSync(CONFIG_FOLDER, { recursive: true });
      fs__namespace.writeFileSync(sessionFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to write session file:", error);
    }
  }
  getSession() {
    const session = this.readSessionFile();
    if (session?.email && session?.token) {
      return {
        email: session.email,
        token: session.token
      };
    }
    try {
      const legacy = require(legacyLicenseFilePath);
      if (legacy?.email && legacy?.licenseToken) {
        return { email: legacy.email, token: legacy.licenseToken };
      }
    } catch {
    }
    return void 0;
  }
  setSession(email, token) {
    const existing = this.readSessionFile();
    this.writeSessionFile({ ...existing, email, token });
    try {
      if (fs__namespace.existsSync(legacyLicenseFilePath)) {
        fs__namespace.unlinkSync(legacyLicenseFilePath);
      }
    } catch {
    }
  }
  getLastOnlineAt() {
    return this.readSessionFile()?.lastOnlineAt;
  }
  setLastOnlineAt(timestamp) {
    const existing = this.readSessionFile();
    if (existing) {
      this.writeSessionFile({ ...existing, lastOnlineAt: timestamp });
    }
  }
  async readFile(filePath) {
    if (filePath.startsWith("pencil:")) {
      filePath = getFilePathForPencilURI(filePath);
    }
    const data = await fs__namespace.promises.readFile(
      path__namespace.isAbsolute(filePath) ? filePath : path__namespace.join(await this.getResourceFolderPath(), filePath)
    );
    return new Uint8Array(data);
  }
  async ensureDir(dirPath) {
    fs__namespace.mkdirSync(dirPath, { recursive: true });
  }
  async writeFile(filePath, contents) {
    fs__namespace.writeFileSync(filePath, contents);
  }
  async saveResource(params) {
    let shouldSave = true;
    if (this.isDirty && !params.userAction) {
      const response = await electron.dialog.showMessageBox(this.window, {
        type: "warning",
        message: `Do you want to save the changes you made to ${this.getResourcePath()}?`,
        buttons: ["Save", "Don't Save", "Cancel"],
        detail: "Your changes will be lost if you don't save them."
      });
      if (response.response === 1) {
        shouldSave = false;
      }
      if (response.response === 2) {
        return true;
      }
    }
    if (this.backupSaveThrottleTimeout) {
      clearTimeout(this.backupSaveThrottleTimeout);
      this.backupSaveThrottleTimeout = void 0;
      this.hasThrottledBackupSave = false;
    }
    const backupPath = this.backupFilePath;
    if (backupPath) {
      try {
        if (fs__namespace.existsSync(backupPath)) {
          fs__namespace.unlinkSync(backupPath);
        }
      } catch (e) {
        logger.warn(`Failed to remove backup ${backupPath}`, e);
      }
    }
    if (!shouldSave) {
      return false;
    }
    let filePathToSave;
    if (!this.isTemporary()) {
      if (params.saveAs || this.filePath.startsWith("pencil:")) {
        const response = await electron.dialog.showSaveDialog(this.window, {
          title: "Save .pen file as…",
          filters: [
            { name: "Pencil Design Files", extensions: ["pen"] },
            { name: "All Files", extensions: ["*"] }
          ],
          defaultPath: trimPrefix(this.filePath, "pencil:")
        });
        if (response.canceled) {
          return true;
        }
        filePathToSave = response.filePath;
      } else {
        filePathToSave = this.filePath;
      }
    } else {
      const response = await electron.dialog.showSaveDialog(this.window, {
        title: "Save new .pen file",
        defaultPath: "untitled.pen"
      });
      if (response.canceled) {
        return true;
      }
      const srcImages = path__namespace.join(await this.getResourceFolderPath(), "images");
      if (fs__namespace.existsSync(srcImages)) {
        const dstImages = path__namespace.join(path__namespace.dirname(response.filePath), "images");
        fs__namespace.cpSync(srcImages, dstImages, { recursive: true });
        try {
          fs__namespace.rmSync(srcImages, {
            recursive: true,
            force: true
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.toUpperCase().includes("ENOTEMPTY")) {
            const files = [];
            fs__namespace.readdirSync(srcImages).forEach((file) => {
              files.push(file);
            });
            try {
              fs__namespace.rmSync(srcImages, {
                recursive: true,
                force: true,
                maxRetries: 2,
                retryDelay: 100
              });
            } catch (e) {
              throw e;
            } finally {
              throw new Error(`${errorMessage}
${files.join("\n")}`);
            }
          }
          throw error;
        }
      }
      filePathToSave = response.filePath;
    }
    try {
      this.fileContent = await this.onSave(filePathToSave);
    } catch (e) {
      logger.error(`Failed to save ${filePathToSave}`, e);
      return false;
    }
    fs__namespace.writeFileSync(filePathToSave, this.fileContent, "utf8");
    if (this.isTemporary() || params.saveAs) {
      const workspacePath = await this.getWorkspaceFolderPath();
      if (workspacePath) {
        desktopConfig.set("workspaceFolders", {
          ...desktopConfig.get("workspaceFolders"),
          [filePathToSave]: workspacePath
        });
      }
      if (params.userAction) {
        this.emit("load-file", {
          filePath: filePathToSave,
          zoomToFit: false,
          closeCurrent: true
        });
      }
    }
    if (this.isDirty) {
      this.emit("dirty-changed", false);
      this.isDirty = false;
    }
    return false;
  }
  loadFile(filePath) {
    this.emit("load-file", { filePath, zoomToFit: true });
  }
  fileChanged() {
    if (!this.isDirty) {
      this.emit("dirty-changed", true);
      this.isDirty = true;
    }
    this.saveBackup();
  }
  async saveBackup() {
    if (this.isTemporary() || !this.backupFilePath) {
      return;
    }
    if (this.backupSaveThrottleTimeout) {
      this.hasThrottledBackupSave = true;
    } else {
      const backupPath = this.backupFilePath;
      await fs__namespace.promises.mkdir(path__namespace.dirname(backupPath), {
        recursive: true
      });
      try {
        await fs__namespace.promises.writeFile(backupPath, await this.onSave(this.filePath));
        logger.info("Saved backup to ", backupPath);
      } catch (e) {
        logger.error(`Failed to save backup ${backupPath}`, e);
      }
      this.backupSaveThrottleTimeout = setTimeout(() => {
        this.backupSaveThrottleTimeout = void 0;
        if (this.hasThrottledBackupSave) {
          this.hasThrottledBackupSave = false;
          this.saveBackup();
        }
      }, 5e3);
    }
  }
  async importFiles(files) {
    const baseDirectory = await this.getResourceFolderPath();
    let imagesDirectory = baseDirectory;
    if (this.isTemporary()) {
      imagesDirectory = path__namespace.join(imagesDirectory, "images");
      await fs__namespace.promises.mkdir(imagesDirectory, { recursive: true });
    }
    const result = new Array(files.length).fill(void 0);
    for (let i = 0; i < files.length; i++) {
      const { fileName, fileContents } = files[i];
      const ext = path__namespace.extname(fileName);
      const base = path__namespace.basename(fileName, ext);
      const buffer = Buffer.from(fileContents);
      let candidate = path__namespace.join(imagesDirectory, `${base}${ext}`);
      let counter = 0;
      for (; ; ) {
        try {
          await fs__namespace.promises.writeFile(candidate, buffer, { flag: "wx" });
          result[i] = { filePath: path__namespace.relative(baseDirectory, candidate) };
          break;
        } catch (e) {
          if (e.code !== "EEXIST") {
            throw e;
          }
        }
        try {
          const existing = await fs__namespace.promises.readFile(candidate);
          if (existing.equals(buffer)) {
            result[i] = { filePath: path__namespace.relative(baseDirectory, candidate) };
            break;
          }
        } catch (e) {
          if (e.code === "ENOENT" || e.code === "EISDIR") {
            continue;
          }
          throw e;
        }
        counter++;
        candidate = path__namespace.join(imagesDirectory, `${base}-${counter}${ext}`);
      }
    }
    return result;
  }
  async importFileByName(fileName, fileContents) {
    const imported = await this.importFiles([{ fileName, fileContents }]);
    const file = imported[0];
    if (!file) {
      throw new Error("Failed to import file");
    }
    return file;
  }
  async importFileByUri(fileUriString) {
    const sourceFile = node_url.fileURLToPath(fileUriString);
    const fileName = path__namespace.basename(sourceFile);
    const fileContents = fs__namespace.readFileSync(sourceFile);
    const result = await this.importFileByName(fileName, fileContents.buffer);
    return {
      filePath: result.filePath,
      fileContents: fileContents.buffer
    };
  }
  async openDocument(type) {
    logger.info("openDocument", type);
    const filePath = type.endsWith(".pen") ? type : `pencil-${type}.pen`;
    this.emit("load-file", { filePath, zoomToFit: true });
  }
  getActiveThemeKind() {
    return electron.nativeTheme.shouldUseDarkColors ? "dark" : "light";
  }
  async submitPrompt(prompt, modelID, _selectedIDs, files) {
    logger.info("submitPrompt", prompt, modelID);
    this.emit("prompt-agent", prompt, modelID, files);
  }
  async loadURL(fileToLoad) {
    logger.info("[DesktopResourceDevice] loadURL() | fileToLoad:", fileToLoad);
    if (IS_DEV) {
      return this.window.webContents.loadURL(`http://localhost:${EDITOR_PORT}/#/editor/${fileToLoad}`);
    }
    return this.window.webContents.loadURL(`${APP_PROTOCOL}://editor/#/editor/${fileToLoad}`);
  }
  toggleDesignMode() {
    logger.info("toggleDesignMode not implemented for desktop");
  }
  setLeftSidebarVisible(visible) {
    logger.info("setLeftSidebarVisible not implemented for desktop", visible);
  }
  signOut() {
    for (const filePath of [sessionFilePath, legacyLicenseFilePath]) {
      try {
        if (fs__namespace.existsSync(filePath)) {
          fs__namespace.unlinkSync(filePath);
        }
      } catch {
      }
    }
  }
  openExternalUrl(url) {
    electron.shell.openExternal(url);
  }
  getAgentPackagePath(type) {
    return type === "codex" ? getCodexPackagePath() : getClaudeCodePackagePath();
  }
  getAgentApiKey(type) {
    return type === "codex" ? desktopConfig.get("codexLoginType") === "api-key" ? desktopConfig.get("codexApiKey") : void 0 : desktopConfig.get("claudeLoginType") === "api-key" ? desktopConfig.get("claudeApiKey") : void 0;
  }
  execPath() {
    return getClaudeExecPath();
  }
  getAgentEnv() {
    return getClaudeCodeEnv();
  }
  agentIncludePartialMessages() {
    return true;
  }
  isTemporary() {
    const resource = this.getResourcePath();
    return !path__namespace.isAbsolute(resource) && resource.startsWith("pencil-");
  }
  async getResourceFolderPath() {
    if (!this.isTemporary()) {
      return path__namespace.dirname(this.getResourcePath());
    }
    const resourcePath = path__namespace.join(CONFIG_FOLDER, "resources", this.id);
    fs__namespace.mkdirSync(resourcePath, { recursive: true });
    return resourcePath;
  }
  async saveTempFile(base64Data, ext, name) {
    const tmpDir = path__namespace.join(os__namespace.tmpdir(), "pencil-clipboard");
    if (!fs__namespace.existsSync(tmpDir)) {
      await fs__namespace.promises.mkdir(tmpDir, { recursive: true });
    }
    const fileName = name || `clipboard-${Date.now()}.${ext}`;
    const filePath = path__namespace.join(tmpDir, fileName);
    await fs__namespace.promises.writeFile(filePath, Buffer.from(base64Data, "base64"));
    return filePath;
  }
  async cleanupTempFiles(paths) {
    for (const p of paths) {
      try {
        if (fs__namespace.existsSync(p)) {
          fs__namespace.unlinkSync(p);
        }
      } catch (err) {
        logger.warn("failed to clean up temp file", String(err));
      }
    }
  }
  async dispose() {
    this.removeAllListeners();
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    if (!this.isTemporary()) {
      return;
    }
    const dir = await this.getResourceFolderPath();
    if (fs__namespace.existsSync(dir)) {
      await fs__namespace.promises.rm(dir, { recursive: true, force: true });
    }
  }
  async turnIntoLibrary() {
    if (this.isTemporary() || this.filePath.startsWith("pencil:") || this.filePath.toLowerCase().endsWith(".lib.pen")) {
      throw new Error(`Can't turn ${this.filePath} into a library`);
    }
    if (await this.saveResource({ userAction: false })) {
      return;
    }
    let counter = 0;
    let newPath;
    while (true) {
      newPath = `${this.filePath.slice(0, -".pen".length)}${counter === 0 ? "" : `-${counter}`}.lib.pen`;
      counter++;
      try {
        await fs__namespace.promises.access(newPath, fs__namespace.constants.F_OK);
      } catch {
        break;
      }
    }
    await fs__namespace.promises.rename(this.filePath, newPath);
    this.emit("load-file", {
      filePath: newPath,
      zoomToFit: false,
      closeCurrent: true
    });
  }
  async findLibraries() {
    if (this.filePath.startsWith("pencil:") || !path__namespace.isAbsolute(this.filePath)) {
      return [];
    }
    const libraries = [];
    const ignored = /* @__PURE__ */ new Set(["node_modules", ".git"]);
    const visited = /* @__PURE__ */ new Set();
    const collectLibraries = async (_path) => {
      let entries;
      try {
        let stats = await fsPromise__namespace.stat(_path);
        if (stats.isSymbolicLink()) {
          _path = await fsPromise__namespace.realpath(_path);
          stats = await fsPromise__namespace.stat(_path);
        }
        if (visited.has(_path)) {
          return;
        }
        visited.add(_path);
        if (stats.isDirectory()) {
          entries = await fsPromise__namespace.readdir(_path);
        } else {
          if (stats.isFile() && _path.toLowerCase().endsWith(".lib.pen")) {
            libraries.push(_path);
          }
          return;
        }
      } catch (error) {
        logger.error(`Failed to traverse ${_path}`, error);
        return;
      }
      for (const entry of entries) {
        if (!ignored.has(entry)) {
          await collectLibraries(path__namespace.join(_path, entry));
        }
      }
    };
    await collectLibraries(path__namespace.dirname(this.filePath));
    return libraries;
  }
  async browseLibraries(multiple) {
    const result = await electron.dialog.showOpenDialog(this.window, {
      filters: [{ name: "Pencil Libraries", extensions: ["lib.pen"] }],
      properties: multiple ? ["multiSelections"] : void 0
    });
    return result.canceled ? void 0 : result.filePaths;
  }
  async getWorkspaceFolderPath() {
    if (this.isTemporary()) {
      return this.temporaryWorkspacePath;
    }
    const workspaceFolders = desktopConfig.get("workspaceFolders");
    if (workspaceFolders[this.getResourcePath()]) {
      return workspaceFolders[this.getResourcePath()];
    }
    return this.getResourceFolderPath();
  }
  async setWorkspaceFolderPath(workspacePath) {
    if (this.isTemporary()) {
      this.temporaryWorkspacePath = workspacePath;
      return;
    }
    desktopConfig.set("workspaceFolders", {
      ...desktopConfig.get("workspaceFolders"),
      [this.getResourcePath()]: workspacePath
    });
  }
}
function trimPrefix(value, prefix) {
  return value.startsWith(prefix) ? value.substring(prefix.length) : value;
}
function backupFilePath(filePath) {
  return path__namespace.join(CONFIG_FOLDER, "backup", `${sha1Hex(filePath)}`);
}
async function handleExtensionToIDEInstall(ipc2) {
  ipc2.on("add-extension-to-ide", (ide) => {
    if (ide === "cursor") {
      electron.shell.openExternal("cursor:extension/highagency.pencildev");
    }
  });
  for (const ide of ["cursor"]) {
    if (await notifyExtensionInstall(ide)) {
      ipc2.notify("ide-name-changed", ide);
      return;
    }
  }
}
async function notifyExtensionInstall(ide) {
  const userDir = electron.app.getPath("home");
  const idePath = path.join(userDir, `.${ide}`);
  if (!fs.existsSync(idePath)) {
    return false;
  }
  const extensionsPath = path.join(idePath, "extensions");
  if (!fs.existsSync(extensionsPath)) {
    return false;
  }
  const extensions = fs.readdirSync(extensionsPath);
  return !extensions.some((ext) => ext.startsWith("highagency.pencildev"));
}
class IPCElectron extends shared.IPCHost {
  constructor(webContents) {
    const onMessage = (callback) => {
      electron.ipcMain.on("ipc-message", (event, message) => {
        if (event.sender.id === webContents.id) {
          callback(message);
        }
      });
    };
    const sendMessage = (message) => {
      if (!webContents.isDestroyed()) {
        webContents.send("ipc-message", message);
      }
    };
    super(onMessage, sendMessage, logger);
  }
}
let _isUpdateDownloaded = false;
function isUpdateDownloaded() {
  return _isUpdateDownloaded;
}
async function setupUpdater(ipcDeviceManager) {
  const log2 = require("electron-log");
  log2.transports.file.level = "debug";
  electronUpdater.autoUpdater.logger = log2;
  electronUpdater.autoUpdater.autoInstallOnAppQuit = false;
  electronUpdater.autoUpdater.on("update-downloaded", (_info) => {
    _isUpdateDownloaded = true;
    refreshApplicationMenu();
    if (!desktopConfig.get("installOnAppQuit")) {
      ipcDeviceManager.notifyAll("desktop-update-ready", {});
    }
  });
  setInterval(async () => {
    try {
      await checkForUpdates();
    } catch (error) {
      log2.error("Error checking for updates during periodic check:", error);
      Sentry__namespace.captureException(error);
    }
  }, 30 * 60 * 1e3);
  try {
    await checkForUpdates();
  } catch (error) {
    log2.error("Error checking for updates during setup:", error);
    Sentry__namespace.captureException(error);
  }
}
async function checkForUpdates() {
  let updateCheckResult;
  if (electron.net.isOnline()) {
    try {
      updateCheckResult = await electronUpdater.autoUpdater.checkForUpdates();
      if (updateCheckResult?.downloadPromise) {
        updateCheckResult.downloadPromise.catch((error) => {
          if (error?.message?.toUpperCase().includes("NET::ERR")) {
            return;
          }
          if (electron.net.isOnline()) {
            throw error;
          }
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toUpperCase().includes("NET::ERR")) {
        return false;
      }
      if (electron.net.isOnline()) {
        throw error;
      }
    }
  }
  return updateCheckResult ? updateCheckResult.isUpdateAvailable : false;
}
function handleUpdaterNotifications(ipc2) {
  ipc2.on("desktop-update-install", () => {
    desktopConfig.set("installOnAppQuit", false);
    _isUpdateDownloaded = false;
    electronUpdater.autoUpdater.quitAndInstall(false, true);
  });
  ipc2.on("set-install-on-app-quit", () => {
    desktopConfig.set("installOnAppQuit", true);
  });
}
function quitAndInstallIfUpdateDownloaded(params = {}) {
  if (_isUpdateDownloaded && (desktopConfig.get("installOnAppQuit") || params.forceQuitAndInstall)) {
    desktopConfig.set("installOnAppQuit", false);
    _isUpdateDownloaded = false;
    electronUpdater.autoUpdater.quitAndInstall(false, false);
  } else {
    desktopConfig.set("installOnAppQuit", false);
    _isUpdateDownloaded = false;
    electron.app.quit();
  }
}
let menuDependencies;
function buildOpenRecentMenuItem(recent) {
  const files = recent.getRecentFiles();
  const submenu = files.length === 0 ? [{ label: "No Recent Files", enabled: false }] : [
    ...files.map((filePath) => ({
      label: path.basename(filePath),
      click: async () => {
        await recent.openRecentFile(filePath);
      }
    })),
    { type: "separator" },
    {
      label: "Clear Menu",
      click: () => {
        recent.clearRecentFiles();
      }
    }
  ];
  return {
    label: "Open Recent",
    submenu
  };
}
function buildApplicationMenuTemplate(deps) {
  const { ipcDeviceManager, handleNewFile, handleOpenDialog, handleToggleTheme, recentFiles } = deps;
  const settingsItem = {
    label: "Settings…",
    accelerator: "CmdOrCtrl+,",
    click: () => {
      const { ipc: ipc2 } = ipcDeviceManager.getFocusedResourceAndIPC();
      ipc2?.notify("open-settings");
    }
  };
  const viewSubmenu = [
    {
      label: "Show/Hide UI",
      accelerator: "CmdOrCtrl+\\",
      click: () => {
        const { ipc: ipc2 } = ipcDeviceManager.getFocusedResourceAndIPC();
        ipc2?.notify("toggle-ui-visibility");
      }
    },
    { type: "separator" },
    { role: "resetZoom" },
    { role: "zoomIn" },
    { role: "zoomOut" },
    { type: "separator" },
    { role: "togglefullscreen" }
  ];
  if (IS_DEV) {
    viewSubmenu.push({ role: "reload" }, { role: "forceReload" }, {
      role: "toggleDevTools"
    });
  } else {
    viewSubmenu.push({
      label: "Toggle Developer Tools",
      accelerator: "CmdOrCtrl+Shift+Alt+D",
      visible: false,
      click: () => {
        const { device } = ipcDeviceManager.getFocusedResourceAndIPC();
        if (device) {
          device.getWindow().webContents.toggleDevTools();
        }
      }
    });
  }
  const windowSubmenu = [
    { role: "minimize" },
    { role: "zoom" },
    { type: "separator" },
    {
      label: "Toggle Light/Dark Mode",
      click: () => handleToggleTheme()
    },
    { type: "separator" },
    {
      label: "Organize Windows into Grid",
      click: () => organizeWindowsIntoGrid()
    },
    { type: "separator" }
  ];
  if (IS_MAC) {
    windowSubmenu.push(
      { type: "separator" },
      { role: "front" },
      { type: "separator" },
      { role: "window" }
    );
  } else {
    windowSubmenu.push({ role: "close" });
  }
  const helpSubmenu = [
    {
      label: "Pencil Documentation",
      click: async () => {
        await electron.shell.openExternal("https://docs.pencil.dev");
      }
    },
    {
      label: "Prompt Gallery && Tips",
      click: async () => {
        await electron.shell.openExternal("https://pencil.dev/prompts");
      }
    },
    {
      label: "Pencil.dev Website",
      click: async () => {
        await electron.shell.openExternal("https://pencil.dev");
      }
    },
    {
      type: "separator"
    },
    {
      label: "Cursor Extension",
      click: async () => {
        await electron.shell.openExternal("cursor:extension/highagency.pencildev");
      }
    },
    {
      label: "VSCode Extension",
      click: async () => {
        await electron.shell.openExternal(
          "https://marketplace.visualstudio.com/items?itemName=highagency.pencildev"
        );
      }
    },
    {
      type: "separator"
    },
    {
      label: "Join Our Discord",
      click: async () => {
        await electron.shell.openExternal("https://discord.gg/Azsk8cnnVp");
      }
    }
  ];
  if (!IS_MAC) {
    helpSubmenu.push(
      { type: "separator" },
      {
        label: isUpdateDownloaded() ? "Restart && Install Update" : "Check for Updates…",
        click: () => isUpdateDownloaded() ? quitAndInstallIfUpdateDownloaded({ forceQuitAndInstall: true }) : handleCheckForUpdates(ipcDeviceManager)
      },
      { type: "separator" },
      { role: "about" }
    );
  }
  const fileSubmenu = [
    {
      label: "New File",
      accelerator: "CmdOrCtrl+N",
      click: async () => {
        return handleNewFile();
      }
    },
    {
      label: "Open…",
      accelerator: "CmdOrCtrl+O",
      click: async () => {
        return handleOpenDialog();
      }
    },
    buildOpenRecentMenuItem(recentFiles),
    {
      type: "separator"
    },
    {
      label: "Import Image/SVG/Figma...",
      click: async () => {
        const { device, ipc: ipc2 } = ipcDeviceManager.getFocusedResourceAndIPC();
        if (device && ipc2) {
          return handleImportImages(device.getWindow(), ipc2);
        }
      }
    },
    {
      label: "Export Selection to...",
      submenu: [
        {
          label: "PDF",
          click: () => {
            const { ipc: ipc2 } = ipcDeviceManager.getFocusedResourceAndIPC();
            ipc2?.notify("export-selection", { format: "pdf" });
          }
        },
        {
          label: "PNG",
          click: () => {
            const { ipc: ipc2 } = ipcDeviceManager.getFocusedResourceAndIPC();
            ipc2?.notify("export-selection", { format: "png" });
          }
        },
        {
          label: "JPEG",
          click: () => {
            const { ipc: ipc2 } = ipcDeviceManager.getFocusedResourceAndIPC();
            ipc2?.notify("export-selection", { format: "jpeg" });
          }
        },
        {
          label: "WebP",
          click: () => {
            const { ipc: ipc2 } = ipcDeviceManager.getFocusedResourceAndIPC();
            ipc2?.notify("export-selection", { format: "webp" });
          }
        }
      ]
    },
    {
      type: "separator"
    },
    {
      label: "Guide: How to Export Design to Code...",
      click: async () => {
        const { ipc: ipc2 } = ipcDeviceManager.getFocusedResourceAndIPC();
        ipc2?.notify("show-code-mcp-dialog");
      }
    },
    {
      label: "Guide: How to Import from Figma...",
      click: async () => {
        const device = ipcDeviceManager.getFocusedResource();
        if (device) {
          return handleImportFigma(device.getWindow());
        }
      }
    }
  ];
  if (process.platform !== "win32") {
    fileSubmenu.push(
      { type: "separator" },
      {
        label: "Install 'pencil' command in PATH",
        click: async () => installPencilToPath(ipcDeviceManager)
      }
    );
  }
  fileSubmenu.push(
    { type: "separator" },
    {
      label: "Save",
      accelerator: "CmdOrCtrl+S",
      click: async () => {
        const { device } = ipcDeviceManager.getFocusedResourceAndIPC();
        if (device) {
          await device.saveResource({ userAction: true });
        }
      }
    },
    {
      label: "Save As…",
      accelerator: "CmdOrCtrl+Shift+S",
      click: async () => {
        const { device } = ipcDeviceManager.getFocusedResourceAndIPC();
        if (device) {
          await device.saveResource({
            userAction: true,
            saveAs: true
          });
        }
      }
    },
    { type: "separator" }
  );
  if (!IS_MAC) {
    fileSubmenu.push(settingsItem, { type: "separator" });
  }
  fileSubmenu.push({ role: "close" });
  const template = [
    {
      label: "File",
      submenu: fileSubmenu
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "delete" },
        { type: "separator" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: viewSubmenu
    },
    {
      label: "Window",
      submenu: windowSubmenu
    },
    {
      role: "help",
      label: "Help",
      submenu: helpSubmenu
    }
  ];
  if (process.platform === "darwin") {
    template.unshift({
      label: electron.app.name,
      submenu: [
        { role: "about" },
        {
          label: isUpdateDownloaded() ? "Restart && Install Update" : "Check for Updates…",
          click: () => isUpdateDownloaded() ? quitAndInstallIfUpdateDownloaded({ forceQuitAndInstall: true }) : handleCheckForUpdates(ipcDeviceManager)
        },
        { type: "separator" },
        settingsItem,
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    });
  }
  return template;
}
function setupMenu(ipcDeviceManager, handleNewFile, handleOpenDialog, handleToggleTheme, recentFiles) {
  menuDependencies = {
    ipcDeviceManager,
    handleNewFile,
    handleOpenDialog,
    handleToggleTheme,
    recentFiles
  };
  const menu = electron.Menu.buildFromTemplate(buildApplicationMenuTemplate(menuDependencies));
  electron.Menu.setApplicationMenu(menu);
}
function refreshApplicationMenu() {
  if (!menuDependencies) {
    return;
  }
  const menu = electron.Menu.buildFromTemplate(buildApplicationMenuTemplate(menuDependencies));
  electron.Menu.setApplicationMenu(menu);
}
async function handleCheckForUpdates(ipcDeviceManager) {
  if (IS_DEV) {
    return;
  }
  try {
    const isUpdateAvailable = await checkForUpdates();
    const device = ipcDeviceManager.getFocusedResource();
    if (isUpdateAvailable) {
      if (!desktopConfig.get("installOnAppQuit")) {
        ipcDeviceManager.notifyAll("desktop-update-available", {});
      }
    } else if (device) {
      electron.dialog.showMessageBox(device.getWindow(), {
        type: "info",
        title: "No Updates Available",
        message: "There are currently no updates available."
      });
    }
  } catch (error) {
    logger.error("Error checking for updates from menu:", error);
    Sentry__namespace.captureException(error);
  }
}
async function handleImportFigma(mainWindow) {
  await electron.dialog.showMessageBox(mainWindow, {
    type: "info",
    title: "Import from Figma",
    message: "How to import from Figma",
    detail: "1) Copy/Paste: Copy any layer or frame in Figma and paste it onto the canvas in Pencil. Btw: Images are not included.\n\n2) Import .fig file: For a full import including images, export a .fig file from Figma (File > Save local copy) and drag and drop it onto Pencil.\n\nNote: Some advanced graphics features might not yet be supported. Multi-page .fig files are not supported yet (can choose which page to import)."
  });
}
async function handleImportImages(mainWindow, ipc2) {
  const result = await electron.dialog.showOpenDialog(mainWindow, {
    title: "Import Image, SVG or Figma",
    filters: [
      {
        name: "Images & Figma",
        extensions: ["png", "jpg", "jpeg", "svg", "fig"]
      },
      { name: "All Files", extensions: ["*"] }
    ],
    properties: ["openFile", "multiSelections"]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    ipc2?.notify("import-images", { filePaths: result.filePaths });
  }
}
function organizeWindowsIntoGrid() {
  const windows = electron.BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
  if (windows.length === 0) {
    return;
  }
  const focused = electron.BrowserWindow.getFocusedWindow();
  const display = focused ? electron.screen.getDisplayNearestPoint(focused.getBounds()) : electron.screen.getPrimaryDisplay();
  const { x, y, width, height } = display.workArea;
  const n = windows.length;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cellWidth = Math.floor(width / cols);
  const cellHeight = Math.floor(height / rows);
  windows.forEach((win, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    win.setBounds({
      x: x + col * cellWidth,
      y: y + row * cellHeight,
      width: cellWidth,
      height: cellHeight
    });
  });
}
async function installPencilToPath(ipcDeviceManager) {
  const exePath = electron.app.getPath("exe");
  const localBinDir = path.join(electron.app.getPath("home"), ".local", "bin");
  const scriptPath = path.join(localBinDir, "pencil");
  const scriptContent = `#!/bin/sh
exec "${exePath}" "$@"
`;
  try {
    if (!fs.existsSync(localBinDir)) {
      await fs.promises.mkdir(localBinDir, { recursive: true });
    }
    try {
      await fs.promises.unlink(scriptPath);
    } catch {
    }
    await fs.promises.writeFile(scriptPath, scriptContent, {
      mode: 493
    });
    const device = ipcDeviceManager.getFocusedResource();
    if (device) {
      electron.dialog.showMessageBox(device.getWindow(), {
        type: "info",
        title: "Command Installed",
        message: "'pencil' command installed successfully.",
        detail: "Make sure ~/.local/bin is in your PATH."
      });
    }
  } catch (error) {
    const device = ipcDeviceManager.getFocusedResource();
    if (device) {
      electron.dialog.showMessageBox(device.getWindow(), {
        type: "error",
        title: "Installation Failed",
        message: "Failed to install 'pencil' command.",
        detail: String(error)
      });
    }
  }
}
const MAX_RECENT_FILES = 14;
class PencilApp {
  constructor() {
    this.wsServer = new wsServer.WebSocketServerManager(logger, WS_PORT);
    this.mcpAdapter = new DesktopMCPAdapter(APP_FOLDER_PATH);
    this.ipcDeviceManager = new ipc.IPCDeviceManager(
      this.wsServer,
      logger,
      APP_FOLDER_PATH,
      this.mcpAdapter.getAppName(),
      void 0,
      async (filePath) => {
        await this.loadFile(filePath);
      }
    );
    this.agentConfigManager = new AgentConfigManager(this.ipcDeviceManager);
  }
  async cleanup() {
    await this.ipcDeviceManager.stopAllAgents();
  }
  async initialize(args) {
    this.wsServer.start();
    this.ipcDeviceManager.proxyMcpToolCallRequests();
    this.wsServer.on("ready", async (port) => {
      await this.mcpAdapter.saveMCPAppInfo(`${port}`);
      await this.mcpAdapter.setupIntegrations(desktopConfig.get("enabledIntegrations"));
    });
    if (!IS_DEV) {
      await setupUpdater(this.ipcDeviceManager);
    }
    setupMenu(
      this.ipcDeviceManager,
      this.handleNewFile.bind(this),
      this.handleOpenDialog.bind(this),
      this.handleToggleTheme.bind(this),
      {
        getRecentFiles,
        openRecentFile: (filePath) => this.loadFile(filePath, true),
        clearRecentFiles
      }
    );
    await setupClaudeCodeResources();
    let fileToOpen = args?.filePath;
    if (!fileToOpen) {
      const recentFiles = getRecentFiles();
      if (recentFiles.length > 0 && fs.existsSync(recentFiles[0])) {
        fileToOpen = recentFiles[0];
      } else {
        fileToOpen = "pencil-welcome-desktop.pen";
      }
    }
    if (args?.agentExecuteConfig) {
      await openWithAgentExecuteConfig(
        this.ipcDeviceManager,
        this.loadFile.bind(this),
        args.agentExecuteConfig
      );
      if (args.agentExecuteConfig.length >= 2) {
        organizeWindowsIntoGrid();
      }
      return;
    }
    await this.loadFile(fileToOpen, true);
  }
  async loadFile(filePath, zoomToFit = false) {
    logger.info("loadFile", filePath, "zoomToFit:", zoomToFit);
    const existingDevice = this.ipcDeviceManager.getResourceDevice(filePath);
    if (existingDevice) {
      const desktopDevice = existingDevice;
      desktopDevice.focusWindow();
      return;
    }
    let fileContent;
    let fileIsDirty = false;
    let fileError;
    try {
      if (!filePath.startsWith("pencil:") && !path.isAbsolute(filePath)) {
        const url = IS_DEV ? `http://localhost:${EDITOR_PORT}/data/${filePath}` : `${APP_PROTOCOL}://editor/data/${filePath}`;
        const response = await electron.net.fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load bundled file: ${filePath} (${response.status})`);
        }
        fileContent = await response.text();
      } else {
        let fileToRead = filePath.startsWith("pencil:") ? getFilePathForPencilURI(filePath) : filePath;
        if (!filePath.startsWith("pencil:")) {
          const backupPath = backupFilePath(fileToRead);
          let backupStat;
          try {
            backupStat = await fs.promises.stat(backupPath);
          } catch {
          }
          if (backupStat) {
            const fileStat = await fs.promises.stat(fileToRead);
            if (fileStat.mtime < backupStat.mtime) {
              logger.info(
                `Backup is ${backupPath} newer (${backupStat.mtime}) than file ${fileToRead} (${fileStat.mtime}), loading it.`
              );
              fileToRead = backupPath;
              fileIsDirty = true;
            } else {
              logger.info(
                `Backup is ${backupPath} older (${backupStat.mtime}) than file ${fileToRead} (${fileStat.mtime}), ignoring it.`
              );
            }
          }
        }
        fileContent = await fs.promises.readFile(fileToRead, "utf8");
      }
    } catch (e) {
      fileContent = "";
      fileError = {
        filePath,
        errorMessage: e instanceof Error ? e.message : void 0
      };
    }
    const device = new DesktopResourceDevice(
      filePath,
      fileContent,
      fileIsDirty,
      (pathToSave) => ipc2.request("save", node_url.pathToFileURL(pathToSave).toString())
    );
    const ipc2 = new IPCElectron(device.getWindow().webContents);
    if (fileError) {
      ipc2.notify("file-error", fileError);
      this.ipcDeviceManager.waitForDocumentReady(filePath).then(() => {
        ipc2.notify("file-error", fileError);
      });
    }
    ipc2.on("add-to-chat", async (message) => {
      ipc2.notify("add-to-chat", message);
    });
    ipc2.handle("get-fullscreen", () => {
      return device.getWindow().isFullScreen();
    });
    ipc2.handle("get-active-integrations", () => {
      return {
        active: desktopConfig.get("enabledIntegrations"),
        supported: DesktopMCPAdapter.getSupportedIntegrations()
      };
    });
    ipc2.handle("get-mcp-config", () => {
      const mcpConfig = mcp.getMcpConfiguration({
        folderPath: APP_FOLDER_PATH,
        appName: this.mcpAdapter.getAppName()
      });
      return JSON.stringify(mcpConfig);
    });
    ipc2.on("change-workspace-folder", async (payload) => {
      const window = device.getWindow();
      const filePath2 = node_url.fileURLToPath(payload.fileURI);
      const result = await electron.dialog.showOpenDialog(window, {
        title: "Select Workspace Folder",
        properties: ["openDirectory"],
        defaultPath: path.dirname(filePath2)
      });
      if (result.canceled || result.filePaths.length === 0) {
        return;
      }
      const folder = result.filePaths[0];
      device.setWorkspaceFolderPath(folder);
      ipc2.notify("workspace-folder-changed", folder);
    });
    ipc2.on("toggle-theme", () => {
      this.handleToggleTheme();
    });
    ipc2.on("set-native-theme", (payload) => {
      electron.nativeTheme.themeSource = payload.theme;
    });
    ipc2.on("desktop-open-terminal", () => {
      openTerminal();
    });
    ipc2.on("claude-set", ({ loginType, apiKey }) => {
      this.agentConfigManager.set("claude", loginType, apiKey);
    });
    ipc2.on("codex-set", ({ loginType, apiKey }) => {
      this.agentConfigManager.set("codex", loginType, apiKey);
    });
    ipc2.on("toggle-mcp-integration", async ({ integration, state }) => {
      await this.mcpAdapter.toggleIntegration(integration, state);
      ipc2.notify("active-integrations", {
        active: desktopConfig.get("enabledIntegrations"),
        supported: DesktopMCPAdapter.getSupportedIntegrations()
      });
    });
    ipc2.on("show-about", () => {
      electron.app.showAboutPanel();
    });
    ipc2.on("initialized", () => {
      this.agentConfigManager.notify();
    });
    await handleExtensionToIDEInstall(ipc2);
    this.ipcDeviceManager.addResource(ipc2, device);
    this.ipcDeviceManager.updateLastResource(filePath);
    device.on("load-file", async (ev) => {
      if (ev.filePath.startsWith("file:")) {
        ev.filePath = node_url.fileURLToPath(ev.filePath);
      }
      await this.loadFile(ev.filePath, ev.zoomToFit);
      if (ev.closeCurrent) {
        await this.ipcDeviceManager.removeResource(device.getResourcePath());
      }
    });
    device.on("dirty-changed", async (isDirty) => {
      ipc2.notify("dirty-changed", isDirty);
    });
    device.on("prompt-agent", (prompt, modelID, files) => {
      const loginType = this.agentConfigManager.get().claude.loginType;
      if (loginType === void 0) {
        logger.warn("Cannot prompt agent: Claude login type is not set.");
        return;
      }
      ipc2.notify("prompt-agent", {
        prompt,
        modelID: shared.mapCanvasModelsToThirdParty("claude", loginType, modelID),
        files
      });
    });
    device.on("window-closed", async () => {
      await this.ipcDeviceManager.removeResource(device.getResourcePath());
    });
    device.on("window-fullscreen-changed", (flag) => {
      ipc2.notify("fullscreen-change", flag);
    });
    device.on("window-focused", () => {
      this.ipcDeviceManager.updateLastResource(device.getResourcePath());
    });
    device.on("window-load-finished", async (initial) => {
      if (!initial) {
        await this.loadFile(device.getResourcePath());
      }
    });
    addRecentFile(filePath);
    if (device.getWindow().webContents.getURL() !== "") {
      ipc2.notify("file-update", {
        content: device.getResourceContents(),
        fileURI: device.getResourcePath().startsWith("pencil:") ? device.getResourcePath() : node_url.pathToFileURL(device.getResourcePath()).toString(),
        isDirty: device.getIsDirty(),
        zoomToFit
      });
    } else {
      await device.loadURL(path.isAbsolute(filePath) ? "" : `${filePath}`);
    }
    const workspaceFolders = desktopConfig.get("workspaceFolders");
    const workspaceFolder = workspaceFolders[filePath];
    if (workspaceFolder) {
      ipc2.notify("workspace-folder-changed", workspaceFolder);
    }
    handleUpdaterNotifications(ipc2);
  }
  getFocusedWindow() {
    const device = this.ipcDeviceManager.getFocusedResource();
    if (!device) {
      return void 0;
    }
    return device.getWindow();
  }
  async handleLoadFile(filePath, zoomToFit) {
    await this.loadFile(filePath, zoomToFit);
  }
  async handleNewFile() {
    await this.handleLoadFile("pencil-new.pen", true);
  }
  async handleOpenDialog() {
    const device = this.ipcDeviceManager.getFocusedResource();
    if (!device) {
      return;
    }
    const window = device.getWindow();
    const result = await electron.dialog.showOpenDialog(window, {
      title: "Open .pen file",
      filters: [
        { name: "Pencil Design Files", extensions: ["pen"] },
        { name: "All Files", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return;
    }
    await this.loadFile(result.filePaths[0], true);
  }
  handleToggleTheme() {
    this.ipcDeviceManager.notifyAll("toggle-theme", {});
  }
}
function addRecentFile(filePath) {
  if (!path.isAbsolute(filePath)) {
    return;
  }
  const recentFiles = desktopConfig.get("recentFiles") ?? [];
  const filtered = recentFiles.filter((f) => f !== filePath);
  const updated = [filePath, ...filtered].slice(0, MAX_RECENT_FILES);
  desktopConfig.set("recentFiles", updated);
  refreshApplicationMenu();
}
function getRecentFiles() {
  const recentFiles = desktopConfig.get("recentFiles") ?? [];
  return recentFiles.filter((f) => fs.existsSync(f));
}
function clearRecentFiles() {
  desktopConfig.set("recentFiles", []);
  refreshApplicationMenu();
}
function openTerminal() {
  const platform = os.platform();
  if (platform === "darwin") {
    node_child_process.exec("open -a iTerm", (error) => {
      if (error) {
        node_child_process.exec("open -a Terminal");
      }
    });
  } else if (platform === "win32") {
    node_child_process.exec("start cmd.exe");
  }
}
let initArgs = getInitArgs();
let pencilApp;
const SHOULD_OPEN_DEVTOOLS = IS_DEV || process.env.PENCIL_OPEN_DEVTOOLS === "1";
const gotTheLock = electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", (_event, commandLine) => {
    const focusedWindow = pencilApp?.getFocusedWindow();
    if (focusedWindow) {
      if (focusedWindow.isMinimized()) {
        focusedWindow.restore();
      }
      focusedWindow.focus();
    }
    const args = commandLine.slice(electron.app.isPackaged ? 1 : 2);
    const fileArg = args.find((arg) => arg.endsWith(".pen"));
    if (fileArg && pencilApp) {
      const resolvedPath = resolveFilePath(fileArg);
      if (fs__namespace.existsSync(resolvedPath)) {
        pencilApp.loadFile(resolvedPath, true);
      }
    }
  });
}
electron.protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);
electron.protocol.registerSchemesAsPrivileged([
  {
    scheme: "pencil-proxy",
    privileges: {
      standard: true,
      // 像 http 一样处理
      secure: true,
      // 标记为安全来源
      supportFetchAPI: true,
      // 允许 fetch
      corsEnabled: true,
      // 允许跨域
      stream: true
      // 支持流
    }
  }
]);
electron.app.whenReady().then(async () => {
  logger.info(
    `App ready. IS_DEV: ${IS_DEV}, NODE_ENV: ${process.env.NODE_ENV}`
  );
  if (SHOULD_OPEN_DEVTOOLS) {
    electron.app.on("browser-window-created", (_event, window) => {
      window.webContents.once("dom-ready", () => {
        if (!window.webContents.isDevToolsOpened()) {
          window.webContents.openDevTools({ mode: "detach" });
        }
      });
    });
  }
  electron.protocol.handle("pencil-proxy", async (request) => {
    logger.debug("Skipping protocol handler 222 (dev mode)");
    const url = new URL(request.url);
    const path2 = url.pathname;
    console.log(url, path2, "========");
    if (url.hostname === "postai.com" && path2 === "/i/v0/e/") {
      return new Response(JSON.stringify({ status: "Ok" }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }
    if (url.hostname === "postai.com" && path2 === "/flags/") {
      return new Response(
        JSON.stringify({
          errorsWhileComputingFlags: false,
          flags: {
            "strict-batch-design-validation": {
              key: "strict-batch-design-validation",
              enabled: true,
              variant: null,
              reason: {
                code: "condition_match",
                condition_index: 0,
                description: "Matched condition set 1"
              },
              metadata: {
                id: 604440,
                version: 4,
                description: null,
                payload: null
              }
            }
          },
          requestId: "3463ee84-9d0d-4b00-879e-163e1eb91287",
          evaluatedAt: 1775633486383,
          defaultIdentifiedOnly: true,
          sessionRecording: false,
          productTours: false,
          errorTracking: {
            autocaptureExceptions: false,
            suppressionRules: []
          },
          elementsChainAsString: true,
          autocaptureExceptions: false,
          captureDeadClicks: false,
          capturePerformance: {
            network_timing: true,
            web_vitals: false,
            web_vitals_allowed_metrics: null
          },
          surveys: false,
          siteApps: [],
          heatmaps: false,
          supportedCompression: ["gzip", "gzip-js"],
          analytics: {
            endpoint: "/i/v0/e/"
          },
          autocapture_opt_out: false,
          logs: {
            captureConsoleLogs: false
          },
          token: "phc_2wPD6fAAVKHsNwHZW6VjSAYE9ZebYNUA8ybuPhXkGO2",
          hasFeatureFlags: true,
          conversations: false
        }),
        {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" }
        }
      );
    }
    if (url.hostname === "api.pencilai.dev" && path2 === "/auth/request-code") {
      return new Response(JSON.stringify({ message: "Code sent" }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }
    if (url.hostname === "api.pencilai.dev" && path2 === "/auth/check-token") {
      return new Response(JSON.stringify({ status: "delivered" }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }
    if (url.hostname === "api.pencilai.dev" && path2 === "/auth/device-login") {
      return new Response(
        JSON.stringify({
          sessionToken: "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..YoowhuaGZ6hWctSB.ZE2hbMMPLOGls4KOrLR67xvvQF8q5pBklmG0K3QIR4dFPnWxKx3BtqI56Mrxz0QmafxdlCMR-latiaYijqSbF9pzNZCoggF4w4JO1UPGt2PT19ogKfHUk7JoqISzG0wKEOe_nXpUniNuXhhvrASXAJ5M5nXM9Zh8ch5FuWMKAf7Rz7Sya64CoWIewJHogqBtj_igNNgYwj83vQDyjXbCwnADiRmTGeyD_5Ko1xF31gBmIbXhBTQ85q9YLZawjMF5jxlhX7-HxS7Wyabbxz5vKMCFKYb4j0JrchlDYz3h1dvp-OEXbJWNu7FFSGDxpw30voA8wjBn9IjR7NKZXSHOLWuXiUe0cDYmRb3i0wHZ3x3wzHMrRsSgNEe38urrz5nHxdqskJVYwmcD0Y1MjZjIFHQgzzx28uNkXUjkoToLt5P9o37DdwKuLQxNLzz3WUfD-e0.XB9vaGNzlh4wtr0J5g7kaQ",
          email: "james.outer123@gmail.com",
          hasSetPassword: true,
          needsCompletion: false,
          slug: "tmx-1",
          profileUrl: "https://pencil.dev/tmx-1",
          status: "user_with_password"
        }),
        {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" }
        }
      );
    }
    return new Response("Access Denied", { status: 403 });
  });
  if (!IS_DEV && IS_MAC && isRunningFromDmg()) {
    electron.dialog.showMessageBoxSync({
      type: "error",
      buttons: ["OK"],
      message: "Please install app before launching"
    });
    electron.app.quit();
    return;
  }
  if (!IS_DEV) {
    electron.protocol.handle(APP_PROTOCOL, (request) => {
      try {
        const rendererDir = path__namespace.join(__dirname, "..", "renderer");
        const url = new URL(request.url);
        const filePath = url.pathname;
        let targetFile;
        if (filePath === "/" || filePath === "/editor" || filePath === "") {
          targetFile = path__namespace.join(rendererDir, "index.html");
        } else {
          const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
          targetFile = path__namespace.join(rendererDir, cleanPath);
        }
        const resolvedRendererDir = path__namespace.resolve(rendererDir);
        const resolvedTargetFile = path__namespace.resolve(targetFile);
        if (!resolvedTargetFile.startsWith(resolvedRendererDir + path__namespace.sep)) {
          throw new Error(`Invalid protocol path: ${filePath}`);
        }
        return electron.net.fetch(`file://${targetFile}`);
      } catch (error) {
        logger.error("Protocol handler error:", error);
        throw error;
      }
    });
  } else {
    logger.debug("Skipping protocol handler registration (dev mode)");
  }
  pencilApp = new PencilApp();
  await pencilApp.initialize(initArgs);
});
electron.app.on("window-all-closed", async () => {
  if (pencilApp) {
    await pencilApp.cleanup();
  }
  quitAndInstallIfUpdateDownloaded();
});
electron.app.on("open-file", async (event, filePath) => {
  logger.info("open-file", event, filePath);
  event.preventDefault();
  if (path__namespace.extname(filePath) !== ".pen") {
    return;
  }
  if (pencilApp) {
    pencilApp.loadFile(filePath, true);
  } else {
    initArgs = { filePath };
  }
});
function resolveFilePath(filePath) {
  if (path__namespace.isAbsolute(filePath)) {
    return filePath;
  }
  return path__namespace.resolve(process.cwd(), filePath);
}
function getInitArgs() {
  const argIndex = electron.app.isPackaged ? 1 : 2;
  const args = process.argv.slice(argIndex);
  if (args.length === 0) {
    return void 0;
  }
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--agent-config") {
      const configString = args[i + 1];
      if (configString) {
        const config = parseAgentExecuteConfig(configString);
        if (config) {
          result.agentExecuteConfig = config;
        }
      }
      i++;
    } else if (arg === "--file" && i + 1 < args.length) {
      const filePath = args[i + 1];
      const resolvedPath = resolveFilePath(filePath);
      if (fs__namespace.existsSync(resolvedPath) && path__namespace.extname(resolvedPath) === ".pen") {
        result.filePath = resolvedPath;
      } else {
        logger.error(`Error: File not found or invalid: ${filePath}`);
        electron.app.quit();
        return void 0;
      }
      i++;
    }
  }
  return Object.keys(result).length > 0 ? result : void 0;
}
function isRunningFromDmg() {
  const appPath = electron.app.getAppPath();
  if (!appPath.startsWith("/Volumes/")) return false;
  if (!appPath.includes(".app")) return false;
  const pathToCheck = path__namespace.join(appPath.split(".app")[0], ".app");
  try {
    fs__namespace.accessSync(pathToCheck, fs__namespace.constants.W_OK);
    return false;
  } catch {
    return true;
  }
}
