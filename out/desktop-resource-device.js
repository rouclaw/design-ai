"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopResourceDevice = void 0;
exports.backupFilePath = backupFilePath;
const crypto = __importStar(require("node:crypto"));
const fs = __importStar(require("node:fs"));
const fsPromise = __importStar(require("node:fs/promises"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const node_url_1 = require("node:url");
const electron_1 = __importStar(require("electron"));
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const claude_1 = require("./claude");
const codex_1 = require("./codex");
const config_1 = require("./config");
const constants_1 = require("./constants");
const logger_1 = require("./logger");
const utils_1 = require("./utils");
const sessionFilePath = path.join(constants_1.CONFIG_FOLDER, `session-desktop${constants_1.IS_DEV ? "-dev" : ""}.json`);
const legacyLicenseFilePath = path.join(constants_1.CONFIG_FOLDER, `license-token${constants_1.IS_DEV ? "-dev" : ""}.json`);
class DesktopResourceDevice extends eventemitter3_1.default {
    constructor(filePath, fileContent, isDirty, onSave) {
        super();
        this.isDirty = false;
        this.ignoreDirtyOnClose = false;
        this.initialized = false;
        this.hasThrottledBackupSave = false;
        this.id = crypto.randomUUID();
        this.filePath = filePath;
        this.fileContent = fileContent;
        this.isDirty = isDirty;
        this.onSave = onSave;
        const windowBounds = config_1.desktopConfig.get("windowBounds");
        const isMac = process.platform === "darwin";
        const isDark = electron_1.default.nativeTheme.shouldUseDarkColors;
        const vibrancy = isMac && config_1.desktopConfig.get("windowVibrancy");
        const newWindow = new electron_1.BrowserWindow(Object.assign(Object.assign({ width: windowBounds.width, height: windowBounds.height, x: windowBounds.x, y: windowBounds.y, frame: !isMac, transparent: isMac }, (isMac
            ? Object.assign(Object.assign({ titleBarStyle: "hiddenInset" }, (vibrancy ? { vibrancy: "under-window" } : {})), { trafficLightPosition: { x: 14, y: 14 } }) : {})), { backgroundColor: (0, config_1.getWindowBackgroundColor)(vibrancy, isDark), webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, "preload.js"),
            } }));
        newWindow.webContents.setWindowOpenHandler(({ url }) => {
            if (url.startsWith("http://") || url.startsWith("https://")) {
                electron_1.shell.openExternal(url);
                return { action: "deny" };
            }
            return { action: "allow" };
        });
        newWindow.on("close", async (event) => {
            var _a;
            const isLoggedIn = Boolean((_a = this.getSession()) === null || _a === void 0 ? void 0 : _a.token);
            if (!this.ignoreDirtyOnClose && isLoggedIn && this.getIsDirty()) {
                event.preventDefault();
                const cancelled = await this.saveResource({
                    userAction: false,
                });
                if (cancelled) {
                    return;
                }
                this.ignoreDirtyOnClose = true;
                if (!(newWindow === null || newWindow === void 0 ? void 0 : newWindow.isDestroyed())) {
                    newWindow === null || newWindow === void 0 ? void 0 : newWindow.close();
                }
                return;
            }
            this.ignoreDirtyOnClose = false;
        });
        newWindow.on("resized", () => {
            if (newWindow === null || newWindow === void 0 ? void 0 : newWindow.isDestroyed()) {
                return;
            }
            const bounds = newWindow === null || newWindow === void 0 ? void 0 : newWindow.getBounds();
            if (!bounds) {
                return;
            }
            config_1.desktopConfig.set("windowBounds", bounds);
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
                // We dont handle reloads on the initial load.
                if (!this.initialized) {
                    this.initialized = true;
                }
                this.emit("window-load-finished", this.initialized);
            });
        }
        this.window = newWindow;
    }
    get backupFilePath() {
        return this.filePath.startsWith("pencil:")
            ? undefined
            : backupFilePath(this.filePath);
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
        const machineId = os.hostname() + os.platform() + os.arch();
        return crypto.createHash("md5").update(machineId).digest("hex");
    }
    getIsDirty() {
        return this.isDirty;
    }
    readSessionFile() {
        try {
            return JSON.parse(fs.readFileSync(sessionFilePath, "utf8"));
        }
        catch (_a) {
            return undefined;
        }
    }
    writeSessionFile(data) {
        try {
            fs.mkdirSync(constants_1.CONFIG_FOLDER, { recursive: true });
            fs.writeFileSync(sessionFilePath, JSON.stringify(data, null, 2));
        }
        catch (error) {
            console.error("Failed to write session file:", error);
        }
    }
    getSession() {
        const session = this.readSessionFile();
        if ((session === null || session === void 0 ? void 0 : session.email) && (session === null || session === void 0 ? void 0 : session.token)) {
            return {
                email: session.email,
                token: session.token,
            };
        }
        try {
            const legacy = require(legacyLicenseFilePath);
            if ((legacy === null || legacy === void 0 ? void 0 : legacy.email) && (legacy === null || legacy === void 0 ? void 0 : legacy.licenseToken)) {
                return { email: legacy.email, token: legacy.licenseToken };
            }
        }
        catch (_a) { }
        return undefined;
    }
    setSession(email, token) {
        const existing = this.readSessionFile();
        this.writeSessionFile(Object.assign(Object.assign({}, existing), { email, token }));
        // Clean up legacy license file
        try {
            if (fs.existsSync(legacyLicenseFilePath)) {
                fs.unlinkSync(legacyLicenseFilePath);
            }
        }
        catch (_a) { }
    }
    getLastOnlineAt() {
        var _a;
        return (_a = this.readSessionFile()) === null || _a === void 0 ? void 0 : _a.lastOnlineAt;
    }
    setLastOnlineAt(timestamp) {
        const existing = this.readSessionFile();
        if (existing) {
            this.writeSessionFile(Object.assign(Object.assign({}, existing), { lastOnlineAt: timestamp }));
        }
    }
    async readFile(filePath) {
        if (filePath.startsWith("pencil:")) {
            filePath = (0, utils_1.getFilePathForPencilURI)(filePath);
        }
        const data = await fs.promises.readFile(path.isAbsolute(filePath)
            ? filePath
            : path.join(await this.getResourceFolderPath(), filePath));
        return new Uint8Array(data);
    }
    async ensureDir(dirPath) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    async writeFile(filePath, contents) {
        fs.writeFileSync(filePath, contents);
    }
    async saveResource(params) {
        let shouldSave = true;
        if (this.isDirty && !params.userAction) {
            const response = await electron_1.default.dialog.showMessageBox(this.window, {
                type: "warning",
                message: `Do you want to save the changes you made to ${this.getResourcePath()}?`,
                buttons: ["Save", "Don't Save", "Cancel"],
                detail: "Your changes will be lost if you don't save them.",
            });
            // User selected "Don't Save"
            if (response.response === 1) {
                shouldSave = false;
            }
            // User selected "Cancel"
            if (response.response === 2) {
                return true;
            }
        }
        if (this.backupSaveThrottleTimeout) {
            clearTimeout(this.backupSaveThrottleTimeout);
            this.backupSaveThrottleTimeout = undefined;
            this.hasThrottledBackupSave = false;
        }
        const backupFilePath = this.backupFilePath;
        if (backupFilePath) {
            try {
                if (fs.existsSync(backupFilePath)) {
                    fs.unlinkSync(backupFilePath);
                }
            }
            catch (e) {
                logger_1.logger.warn(`Failed to remove backup ${backupFilePath}`, e);
            }
        }
        if (!shouldSave) {
            return false;
        }
        let filePathToSave;
        if (!this.isTemporary()) {
            if (params.saveAs || this.filePath.startsWith("pencil:")) {
                const response = await electron_1.default.dialog.showSaveDialog(this.window, {
                    title: "Save .pen file as…",
                    filters: [
                        { name: "Pencil Design Files", extensions: ["pen"] },
                        { name: "All Files", extensions: ["*"] },
                    ],
                    defaultPath: trimPrefix(this.filePath, "pencil:"),
                });
                if (response.canceled) {
                    return true;
                }
                filePathToSave = response.filePath;
            }
            else {
                filePathToSave = this.filePath;
            }
        }
        else {
            const response = await electron_1.default.dialog.showSaveDialog(this.window, {
                title: "Save new .pen file",
                defaultPath: "untitled.pen",
            });
            if (response.canceled) {
                return true;
            }
            const srcImages = path.join(await this.getResourceFolderPath(), "images");
            if (fs.existsSync(srcImages)) {
                const dstImages = path.join(path.dirname(response.filePath), "images");
                fs.cpSync(srcImages, dstImages, { recursive: true });
                try {
                    fs.rmSync(srcImages, {
                        recursive: true,
                        force: true,
                    });
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    // If deletion fails due to ENOTEMPTY even after retries, log folder contents to see whats up.
                    if (errorMessage.toUpperCase().includes("ENOTEMPTY")) {
                        const files = [];
                        fs.readdirSync(srcImages).forEach((file) => {
                            files.push(file);
                        });
                        try {
                            fs.rmSync(srcImages, {
                                recursive: true,
                                force: true,
                                maxRetries: 2,
                                retryDelay: 100,
                            });
                        }
                        catch (e) {
                            // biome-ignore lint/complexity/noUselessCatch: needs to be done like this
                            throw e;
                        }
                        finally {
                            // biome-ignore lint/correctness/noUnsafeFinally: needs to be done like this
                            throw new Error(`${errorMessage}\n${files.join("\n")}`);
                        }
                    }
                    throw error;
                }
            }
            filePathToSave = response.filePath;
        }
        try {
            this.fileContent = await this.onSave(filePathToSave);
        }
        catch (e) {
            logger_1.logger.error(`Failed to save ${filePathToSave}`, e);
            return false;
        }
        fs.writeFileSync(filePathToSave, this.fileContent, "utf8");
        if (this.isTemporary() || params.saveAs) {
            const workspacePath = await this.getWorkspaceFolderPath();
            if (workspacePath) {
                config_1.desktopConfig.set("workspaceFolders", Object.assign(Object.assign({}, config_1.desktopConfig.get("workspaceFolders")), { [filePathToSave]: workspacePath }));
            }
            if (params.userAction) {
                this.emit("load-file", {
                    filePath: filePathToSave,
                    zoomToFit: false,
                    closeCurrent: true,
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
            return; // NOTE(zaza): we only backup actual physical files
        }
        if (this.backupSaveThrottleTimeout) {
            this.hasThrottledBackupSave = true;
        }
        else {
            const backupFilePath = this.backupFilePath;
            await fs.promises.mkdir(path.dirname(backupFilePath), {
                recursive: true,
            });
            try {
                await fs.promises.writeFile(backupFilePath, await this.onSave(this.filePath));
                logger_1.logger.info("Saved backup to ", backupFilePath);
            }
            catch (e) {
                logger_1.logger.error(`Failed to save backup ${backupFilePath}`, e);
            }
            this.backupSaveThrottleTimeout = setTimeout(() => {
                this.backupSaveThrottleTimeout = undefined;
                if (this.hasThrottledBackupSave) {
                    this.hasThrottledBackupSave = false;
                    this.saveBackup();
                }
            }, 5000);
        }
    }
    async importFiles(files) {
        const baseDirectory = await this.getResourceFolderPath();
        let imagesDirectory = baseDirectory;
        if (this.isTemporary()) {
            imagesDirectory = path.join(imagesDirectory, "images");
            await fs.promises.mkdir(imagesDirectory, { recursive: true });
        }
        const result = new Array(files.length).fill(undefined);
        for (let i = 0; i < files.length; i++) {
            const { fileName, fileContents } = files[i];
            const ext = path.extname(fileName);
            const base = path.basename(fileName, ext);
            const buffer = Buffer.from(fileContents);
            let candidate = path.join(imagesDirectory, `${base}${ext}`);
            let counter = 0;
            // NOTE(sedivy): Loop to find a non-colliding destination file name we
            // can use to store the imported file.
            for (;;) {
                // NOTE(sedivy): Try to claim the file name. If we fail to do an exclusive
                // create, it means the file name is taken.
                try {
                    await fs.promises.writeFile(candidate, buffer, { flag: "wx" });
                    result[i] = { filePath: path.relative(baseDirectory, candidate) };
                    break;
                }
                catch (e) {
                    if (e.code !== "EEXIST") {
                        throw e;
                    }
                }
                // NOTE(sedivy): File name is taken, see if the existing file is
                // identical to what we want to import.
                try {
                    const existing = await fs.promises.readFile(candidate);
                    if (existing.equals(buffer)) {
                        result[i] = { filePath: path.relative(baseDirectory, candidate) };
                        break;
                    }
                }
                catch (e) {
                    if (e.code === "ENOENT" || e.code === "EISDIR") {
                        continue;
                    }
                    throw e;
                }
                // NOTE(sedivy): File name is taken with a different content, try next candidate.
                counter++;
                candidate = path.join(imagesDirectory, `${base}-${counter}${ext}`);
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
        // Simple implementation - copy file to pen directory
        const sourceFile = (0, node_url_1.fileURLToPath)(fileUriString);
        const fileName = path.basename(sourceFile);
        const fileContents = fs.readFileSync(sourceFile);
        const result = await this.importFileByName(fileName, fileContents.buffer);
        return {
            filePath: result.filePath,
            fileContents: fileContents.buffer,
        };
    }
    async openDocument(type) {
        logger_1.logger.info("openDocument", type);
        const filePath = type.endsWith(".pen") ? type : `pencil-${type}.pen`;
        this.emit("load-file", { filePath, zoomToFit: true });
    }
    getActiveThemeKind() {
        return electron_1.default.nativeTheme.shouldUseDarkColors ? "dark" : "light";
    }
    async submitPrompt(prompt, modelID, _selectedIDs, files) {
        logger_1.logger.info("submitPrompt", prompt, modelID);
        this.emit("prompt-agent", prompt, modelID, files);
    }
    async loadURL(fileToLoad) {
        logger_1.logger.info("[DesktopResourceDevice] loadURL() | fileToLoad:", fileToLoad);
        if (constants_1.IS_DEV) {
            return this.window.webContents.loadURL(`http://localhost:${constants_1.EDITOR_PORT}/#/editor/${fileToLoad}`);
        }
        else {
            return this.window.webContents.loadURL(`${constants_1.APP_PROTOCOL}://editor/#/editor/${fileToLoad}`);
        }
    }
    toggleDesignMode() {
        logger_1.logger.info("toggleDesignMode not implemented for desktop");
    }
    setLeftSidebarVisible(visible) {
        logger_1.logger.info("setLeftSidebarVisible not implemented for desktop", visible);
    }
    signOut() {
        for (const filePath of [sessionFilePath, legacyLicenseFilePath]) {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            catch (_a) { }
        }
    }
    openExternalUrl(url) {
        electron_1.shell.openExternal(url);
    }
    getAgentPackagePath(type) {
        return type === "codex"
            ? (0, codex_1.getCodexPackagePath)()
            : (0, claude_1.getClaudeCodePackagePath)();
    }
    getAgentApiKey(type) {
        return type === "codex"
            ? config_1.desktopConfig.get("codexLoginType") === "api-key"
                ? config_1.desktopConfig.get("codexApiKey")
                : undefined
            : config_1.desktopConfig.get("claudeLoginType") === "api-key"
                ? config_1.desktopConfig.get("claudeApiKey")
                : undefined;
    }
    execPath() {
        return (0, claude_1.getClaudeExecPath)();
    }
    getAgentEnv() {
        return (0, claude_1.getClaudeCodeEnv)();
    }
    agentIncludePartialMessages() {
        return true;
    }
    isTemporary() {
        const resource = this.getResourcePath();
        return !path.isAbsolute(resource) && resource.startsWith("pencil-");
    }
    async getResourceFolderPath() {
        if (!this.isTemporary()) {
            return path.dirname(this.getResourcePath());
        }
        const resourcePath = path.join(constants_1.CONFIG_FOLDER, "resources", this.id);
        fs.mkdirSync(resourcePath, { recursive: true });
        return resourcePath;
    }
    async saveTempFile(base64Data, ext, name) {
        const tmpDir = path.join(os.tmpdir(), "pencil-clipboard");
        if (!fs.existsSync(tmpDir)) {
            await fs.promises.mkdir(tmpDir, { recursive: true });
        }
        const fileName = name || `clipboard-${Date.now()}.${ext}`;
        const filePath = path.join(tmpDir, fileName);
        await fs.promises.writeFile(filePath, Buffer.from(base64Data, "base64"));
        return filePath;
    }
    async cleanupTempFiles(paths) {
        for (const p of paths) {
            try {
                if (fs.existsSync(p)) {
                    fs.unlinkSync(p);
                }
            }
            catch (err) {
                logger_1.logger.warn("failed to clean up temp file", err.toString());
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
        if (fs.existsSync(dir)) {
            await fs.promises.rm(dir, { recursive: true, force: true });
        }
    }
    async turnIntoLibrary() {
        if (this.isTemporary() ||
            this.filePath.startsWith("pencil:") ||
            this.filePath.toLowerCase().endsWith(".lib.pen")) {
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
                await fs.promises.access(newPath, fs.constants.F_OK);
            }
            catch (_a) {
                break;
            }
        }
        // NOTE(zaza): possible race condition, but NodeJS doesn't support atomic file move.
        await fs.promises.rename(this.filePath, newPath);
        this.emit("load-file", {
            filePath: newPath,
            zoomToFit: false,
            closeCurrent: true,
        });
    }
    async findLibraries() {
        if (this.filePath.startsWith("pencil:") ||
            !path.isAbsolute(this.filePath)) {
            return [];
        }
        const libraries = [];
        const ignored = new Set(["node_modules", ".git"]);
        const visited = new Set();
        const collectLibraries = async (_path) => {
            let entries;
            try {
                let stats = await fsPromise.stat(_path);
                if (stats.isSymbolicLink()) {
                    _path = await fsPromise.realpath(_path);
                    stats = await fsPromise.stat(_path);
                }
                if (visited.has(_path)) {
                    return;
                }
                visited.add(_path);
                if (stats.isDirectory()) {
                    entries = await fsPromise.readdir(_path);
                }
                else {
                    if (stats.isFile() && _path.toLowerCase().endsWith(".lib.pen")) {
                        libraries.push(_path);
                    }
                    return;
                }
            }
            catch (error) {
                logger_1.logger.error(`Failed to traverse ${_path}`, error);
                return;
            }
            for (const entry of entries) {
                if (!ignored.has(entry)) {
                    await collectLibraries(path.join(_path, entry));
                }
            }
        };
        await collectLibraries(path.dirname(this.filePath));
        return libraries;
    }
    async browseLibraries(multiple) {
        const result = await electron_1.dialog.showOpenDialog(this.window, {
            filters: [{ name: "Pencil Libraries", extensions: ["lib.pen"] }],
            properties: multiple ? ["multiSelections"] : undefined,
        });
        return result.canceled ? undefined : result.filePaths;
    }
    async getWorkspaceFolderPath() {
        if (this.isTemporary()) {
            return this.temporaryWorkspacePath;
        }
        const workspaceFolders = config_1.desktopConfig.get("workspaceFolders");
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
        config_1.desktopConfig.set("workspaceFolders", Object.assign(Object.assign({}, config_1.desktopConfig.get("workspaceFolders")), { [this.getResourcePath()]: workspacePath }));
    }
}
exports.DesktopResourceDevice = DesktopResourceDevice;
function trimPrefix(value, prefix) {
    return value.startsWith(prefix) ? value.substring(prefix.length) : value;
}
function backupFilePath(filePath) {
    return path.join(constants_1.CONFIG_FOLDER, "backup", `${crypto.hash("sha1", filePath)}`);
}
