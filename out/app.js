"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PencilApp = void 0;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const ipc_1 = require("@ha/ipc");
const mcp_1 = require("@ha/mcp");
const shared_1 = require("@ha/shared");
const ws_server_1 = require("@ha/ws-server");
const electron_1 = require("electron");
const agent_config_manager_1 = require("./agent-config-manager");
const agent_execute_config_1 = require("./agent-execute-config");
const claude_1 = require("./claude");
const config_1 = require("./config");
const constants_1 = require("./constants");
const desktop_mcp_adapter_1 = require("./desktop-mcp-adapter");
const desktop_resource_device_1 = require("./desktop-resource-device");
const ide_1 = require("./ide");
const ipc_electron_1 = require("./ipc-electron");
const logger_1 = require("./logger");
const menu_1 = require("./menu");
const updater_1 = require("./updater");
const utils_1 = require("./utils");
const MAX_RECENT_FILES = 14;
class PencilApp {
    constructor() {
        this.wsServer = new ws_server_1.WebSocketServerManager(logger_1.logger, constants_1.WS_PORT);
        this.mcpAdapter = new desktop_mcp_adapter_1.DesktopMCPAdapter(constants_1.APP_FOLDER_PATH);
        this.ipcDeviceManager = new ipc_1.IPCDeviceManager(this.wsServer, logger_1.logger, constants_1.APP_FOLDER_PATH, this.mcpAdapter.getAppName(), undefined, async (filePath) => {
            await this.loadFile(filePath);
        });
        this.agentConfigManager = new agent_config_manager_1.AgentConfigManager(this.ipcDeviceManager);
    }
    async cleanup() {
        await this.ipcDeviceManager.stopAllAgents();
    }
    async initialize(args) {
        this.wsServer.start();
        this.ipcDeviceManager.proxyMcpToolCallRequests();
        this.wsServer.on("ready", async (port) => {
            await this.mcpAdapter.saveMCPAppInfo(`${port}`);
            await this.mcpAdapter.setupIntegrations(config_1.desktopConfig.get("enabledIntegrations"));
        });
        if (!constants_1.IS_DEV) {
            await (0, updater_1.setupUpdater)(this.ipcDeviceManager);
        }
        (0, menu_1.setupMenu)(this.ipcDeviceManager, this.handleNewFile.bind(this), this.handleOpenDialog.bind(this), this.handleToggleTheme.bind(this), {
            getRecentFiles,
            openRecentFile: (filePath) => this.loadFile(filePath, true),
            clearRecentFiles,
        });
        await (0, claude_1.setupClaudeCodeResources)();
        // Determine which file to open on launch
        let fileToOpen = args === null || args === void 0 ? void 0 : args.filePath;
        if (!fileToOpen) {
            const recentFiles = getRecentFiles();
            if (recentFiles.length > 0 && node_fs_1.default.existsSync(recentFiles[0])) {
                fileToOpen = recentFiles[0];
            }
            else {
                fileToOpen = "pencil-welcome-desktop.pen";
            }
        }
        if (args === null || args === void 0 ? void 0 : args.agentExecuteConfig) {
            await (0, agent_execute_config_1.openWithAgentExecuteConfig)(this.ipcDeviceManager, this.loadFile.bind(this), args === null || args === void 0 ? void 0 : args.agentExecuteConfig);
            if (args.agentExecuteConfig.length >= 2) {
                (0, menu_1.organizeWindowsIntoGrid)();
            }
            return;
        }
        await this.loadFile(fileToOpen, true);
    }
    async loadFile(filePath, zoomToFit = false) {
        logger_1.logger.info("loadFile", filePath, "zoomToFit:", zoomToFit);
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
            let fileToRead = filePath.startsWith("pencil:")
                ? (0, utils_1.getFilePathForPencilURI)(filePath)
                : node_path_1.default.isAbsolute(filePath)
                    ? filePath
                    : node_path_1.default.join(electron_1.app.getAppPath(), "out", "data", filePath);
            if (!filePath.startsWith("pencil:")) {
                const backupPath = (0, desktop_resource_device_1.backupFilePath)(fileToRead);
                let backupStat;
                try {
                    backupStat = await node_fs_1.default.promises.stat(backupPath);
                }
                catch (_a) { }
                if (backupStat) {
                    const fileStat = await node_fs_1.default.promises.stat(fileToRead);
                    if (fileStat.mtime < backupStat.mtime) {
                        logger_1.logger.info(`Backup is ${backupPath} newer (${backupStat.mtime}) than file ${fileToRead} (${fileStat.mtime}), loading it.`);
                        fileToRead = backupPath;
                        fileIsDirty = true;
                    }
                    else {
                        logger_1.logger.info(`Backup is ${backupPath} older (${backupStat.mtime}) than file ${fileToRead} (${fileStat.mtime}), ignoring it.`);
                    }
                }
            }
            fileContent = await node_fs_1.default.promises.readFile(fileToRead, "utf8");
        }
        catch (e) {
            // NOTE(zaza): this exploits the bug that ipcDeviceManager.waitForDocumentReady() will only
            // resolve if the editor is not yet initialized.
            // There can be two cases:
            // 1. The editor into which we're loading is not yet initialized. In this case, the synchoronous
            //    "file-error" notification will be lost, because noone is listening for it. So we use
            //     ipcDeviceManager.waitForDocumentReady(), which resolves when the editor is ready.
            // 2. We're replacing the contents of an already initialized editor. In this case, the synchronoous
            //    notification will be handled by the editor, and ipcDeviceManager.waitForDocumentReady() won't
            //    resolve due to a bug in IPCDeviceManager.
            // In effect, we're going to deliver exactly one "file-error" notification in both cases.
            fileContent = "";
            fileError = {
                filePath,
                errorMessage: e instanceof Error ? e.message : undefined,
            };
        }
        const device = new desktop_resource_device_1.DesktopResourceDevice(filePath, fileContent, fileIsDirty, (path) => ipc.request("save", (0, node_url_1.pathToFileURL)(path).toString()));
        const ipc = new ipc_electron_1.IPCElectron(device.getWindow().webContents);
        if (fileError) {
            ipc.notify("file-error", fileError);
            this.ipcDeviceManager.waitForDocumentReady(filePath).then(() => {
                ipc.notify("file-error", fileError);
            });
        }
        ipc.on("add-to-chat", async (message) => {
            // In desktop app we proxy add-to-chat notifications back to the client.
            ipc.notify("add-to-chat", message);
        });
        ipc.handle("get-fullscreen", () => {
            return device.getWindow().isFullScreen();
        });
        ipc.handle("get-active-integrations", () => {
            return {
                active: config_1.desktopConfig.get("enabledIntegrations"),
                supported: desktop_mcp_adapter_1.DesktopMCPAdapter.getSupportedIntegrations(),
            };
        });
        ipc.handle("get-mcp-config", () => {
            const mcpConfig = (0, mcp_1.getMcpConfiguration)({
                folderPath: constants_1.APP_FOLDER_PATH,
                appName: this.mcpAdapter.getAppName(),
            });
            return JSON.stringify(mcpConfig);
        });
        ipc.on("change-workspace-folder", async (payload) => {
            const window = device.getWindow();
            const filePath = (0, node_url_1.fileURLToPath)(payload.fileURI);
            const result = await electron_1.dialog.showOpenDialog(window, {
                title: "Select Workspace Folder",
                properties: ["openDirectory"],
                defaultPath: node_path_1.default.dirname(filePath),
            });
            if (result.canceled || result.filePaths.length === 0) {
                return;
            }
            const folder = result.filePaths[0];
            device.setWorkspaceFolderPath(folder);
            ipc.notify("workspace-folder-changed", folder);
        });
        ipc.on("toggle-theme", () => {
            this.handleToggleTheme();
        });
        ipc.on("set-native-theme", (payload) => {
            electron_1.nativeTheme.themeSource = payload.theme;
            const win = device.getWindow();
            if (!win.isDestroyed()) {
                win.setBackgroundColor((0, config_1.getWindowBackgroundColor)(config_1.desktopConfig.get("windowVibrancy"), payload.theme === "dark"));
            }
        });
        ipc.on("set-vibrancy", (payload) => {
            if (process.platform !== "darwin")
                return;
            config_1.desktopConfig.set("windowVibrancy", payload.enabled);
            const win = device.getWindow();
            if (win.isDestroyed())
                return;
            win.setVibrancy(payload.enabled ? "under-window" : null);
            win.setBackgroundColor((0, config_1.getWindowBackgroundColor)(payload.enabled, electron_1.nativeTheme.shouldUseDarkColors));
        });
        ipc.on("desktop-open-terminal", ({ workspaceFolder, agentType, }) => {
            openTerminal(workspaceFolder, agentType);
        });
        ipc.handle("claude-set", async ({ loginType, apiKey, }) => {
            this.agentConfigManager.set("claude", loginType, apiKey);
        });
        ipc.handle("codex-set", async ({ loginType, apiKey, }) => {
            this.agentConfigManager.set("codex", loginType, apiKey);
        });
        ipc.on("toggle-mcp-integration", async ({ integration, state, }) => {
            await this.mcpAdapter.toggleIntegration(integration, state);
            ipc.notify("active-integrations", {
                active: config_1.desktopConfig.get("enabledIntegrations"),
                supported: desktop_mcp_adapter_1.DesktopMCPAdapter.getSupportedIntegrations(),
            });
        });
        ipc.on("show-about", () => {
            electron_1.app.showAboutPanel();
        });
        ipc.on("initialized", () => {
            this.agentConfigManager.notify();
        });
        await (0, ide_1.handleExtensionToIDEInstall)(ipc);
        this.ipcDeviceManager.addResource(ipc, device);
        this.ipcDeviceManager.updateLastResource(filePath);
        device.on("load-file", async (ev) => {
            // TODO(zaza): get rid of this URL hack
            if (ev.filePath.startsWith("file:")) {
                ev.filePath = (0, node_url_1.fileURLToPath)(ev.filePath);
            }
            await this.loadFile(ev.filePath, ev.zoomToFit);
            if (ev.closeCurrent) {
                await this.ipcDeviceManager.removeResource(device.getResourcePath());
            }
        });
        device.on("dirty-changed", async (isDirty) => {
            ipc.notify("dirty-changed", isDirty);
        });
        device.on("prompt-agent", (prompt, modelID, files) => {
            const loginType = this.agentConfigManager.get().claude.loginType;
            if (loginType === undefined) {
                logger_1.logger.warn("Cannot prompt agent: Claude login type is not set.");
                return;
            }
            ipc.notify("prompt-agent", {
                prompt,
                modelID: (0, shared_1.mapCanvasModelsToThirdParty)("claude", loginType, modelID),
                files,
            });
        });
        device.on("window-closed", async () => {
            await this.ipcDeviceManager.removeResource(device.getResourcePath());
        });
        device.on("window-fullscreen-changed", (flag) => {
            ipc.notify("fullscreen-change", flag);
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
            ipc.notify("file-update", {
                content: device.getResourceContents(),
                fileURI: device.getResourcePath().startsWith("pencil:")
                    ? device.getResourcePath()
                    : (0, node_url_1.pathToFileURL)(device.getResourcePath()).toString(),
                isDirty: device.getIsDirty(),
                zoomToFit,
            });
        }
        else {
            await device.loadURL(node_path_1.default.isAbsolute(filePath) ? "" : `${filePath}`);
        }
        const workspaceFolders = config_1.desktopConfig.get("workspaceFolders");
        const workspaceFolder = workspaceFolders[filePath];
        if (workspaceFolder) {
            ipc.notify("workspace-folder-changed", workspaceFolder);
        }
        (0, updater_1.handleUpdaterNotifications)(ipc);
        return;
    }
    getFocusedWindow() {
        const device = this.ipcDeviceManager.getFocusedResource();
        if (!device) {
            return undefined;
        }
        return device.getWindow();
    }
    async handleLoadFile(filePath, zoomToFit) {
        await this.loadFile(filePath, zoomToFit);
    }
    async handleNewFile() {
        await this.handleLoadFile("pencil-new.pen");
    }
    async handleOpenDialog() {
        const device = this.ipcDeviceManager.getFocusedResource();
        if (!device) {
            return;
        }
        const window = device.getWindow();
        const result = await electron_1.dialog.showOpenDialog(window, {
            title: "Open .pen file",
            filters: [
                { name: "Pencil Design Files", extensions: ["pen"] },
                { name: "All Files", extensions: ["*"] },
            ],
            properties: ["openFile"],
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
exports.PencilApp = PencilApp;
function addRecentFile(filePath) {
    var _a;
    if (!node_path_1.default.isAbsolute(filePath)) {
        return;
    }
    const recentFiles = (_a = config_1.desktopConfig.get("recentFiles")) !== null && _a !== void 0 ? _a : [];
    const filtered = recentFiles.filter((f) => f !== filePath);
    const updated = [filePath, ...filtered].slice(0, MAX_RECENT_FILES);
    config_1.desktopConfig.set("recentFiles", updated);
    (0, menu_1.refreshApplicationMenu)();
}
function getRecentFiles() {
    var _a;
    const recentFiles = (_a = config_1.desktopConfig.get("recentFiles")) !== null && _a !== void 0 ? _a : [];
    return recentFiles.filter((f) => node_fs_1.default.existsSync(f));
}
function clearRecentFiles() {
    config_1.desktopConfig.set("recentFiles", []);
    (0, menu_1.refreshApplicationMenu)();
}
function openTerminal(workspaceFolder, agentType) {
    const platform = node_os_1.default.platform();
    let scriptPath;
    if (agentType) {
        const agentCommand = agentType === "claude" ? "claude" : "codex";
        const dir = workspaceFolder !== null && workspaceFolder !== void 0 ? workspaceFolder : electron_1.app.getPath("downloads");
        if (platform === "win32") {
            scriptPath = node_path_1.default.join(node_os_1.default.tmpdir(), `pencil-open-${agentType}.bat`);
            node_fs_1.default.writeFileSync(scriptPath, `@echo off\r\ncd /d "${dir}"\r\n${agentCommand}\r\n`);
        }
        else {
            scriptPath = node_path_1.default.join(node_os_1.default.tmpdir(), `pencil-open-${agentType}.sh`);
            node_fs_1.default.writeFileSync(scriptPath, `#!/bin/bash\ncd "${dir}"\nexec ${agentCommand}\n`, { mode: 0o755 });
        }
    }
    if (platform === "darwin") {
        (0, node_child_process_1.exec)(scriptPath ? `open -a Terminal "${scriptPath}"` : `open -a Terminal`);
    }
    else if (platform === "win32") {
        (0, node_child_process_1.exec)(scriptPath ? `start cmd.exe /k "${scriptPath}"` : `start cmd.exe`);
    }
}
