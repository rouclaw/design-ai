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
exports.setupMenu = setupMenu;
exports.refreshApplicationMenu = refreshApplicationMenu;
exports.organizeWindowsIntoGrid = organizeWindowsIntoGrid;
const node_path_1 = __importDefault(require("node:path"));
const Sentry = __importStar(require("@sentry/electron/main"));
const electron_1 = require("electron");
const config_1 = require("./config");
const constants_1 = require("./constants");
const logger_1 = require("./logger");
const updater_1 = require("./updater");
let menuDependencies;
function buildOpenRecentMenuItem(recent) {
    const files = recent.getRecentFiles();
    const submenu = files.length === 0
        ? [{ label: "No Recent Files", enabled: false }]
        : [
            ...files.map((filePath) => ({
                label: node_path_1.default.basename(filePath),
                click: async () => {
                    await recent.openRecentFile(filePath);
                },
            })),
            { type: "separator" },
            {
                label: "Clear Menu",
                click: () => {
                    recent.clearRecentFiles();
                },
            },
        ];
    return {
        label: "Open Recent",
        submenu,
    };
}
function buildApplicationMenuTemplate(deps) {
    const { ipcDeviceManager, handleNewFile, handleOpenDialog, handleToggleTheme, recentFiles, } = deps;
    const settingsItem = {
        label: "Settings…",
        accelerator: "CmdOrCtrl+,",
        click: () => {
            const { ipc } = ipcDeviceManager.getFocusedResourceAndIPC();
            ipc === null || ipc === void 0 ? void 0 : ipc.notify("open-settings");
        },
    };
    const template = [
        {
            label: "File",
            submenu: [
                {
                    label: "New File",
                    accelerator: "CmdOrCtrl+N",
                    click: async () => {
                        return handleNewFile();
                    },
                },
                {
                    label: "Open…",
                    accelerator: "CmdOrCtrl+O",
                    click: async () => {
                        return handleOpenDialog();
                    },
                },
                buildOpenRecentMenuItem(recentFiles),
                {
                    type: "separator",
                },
                {
                    label: "Import Image/SVG/Figma...",
                    click: async () => {
                        const { device, ipc } = ipcDeviceManager.getFocusedResourceAndIPC();
                        if (device && ipc) {
                            return handleImportImages(device.getWindow(), ipc);
                        }
                    },
                },
                {
                    label: "Export Selection to...",
                    submenu: [
                        {
                            label: "PDF",
                            click: () => {
                                const { ipc } = ipcDeviceManager.getFocusedResourceAndIPC();
                                ipc === null || ipc === void 0 ? void 0 : ipc.notify("export-selection", { format: "pdf" });
                            },
                        },
                        {
                            label: "PNG",
                            click: () => {
                                const { ipc } = ipcDeviceManager.getFocusedResourceAndIPC();
                                ipc === null || ipc === void 0 ? void 0 : ipc.notify("export-selection", { format: "png" });
                            },
                        },
                        {
                            label: "JPEG",
                            click: () => {
                                const { ipc } = ipcDeviceManager.getFocusedResourceAndIPC();
                                ipc === null || ipc === void 0 ? void 0 : ipc.notify("export-selection", { format: "jpeg" });
                            },
                        },
                        {
                            label: "WebP",
                            click: () => {
                                const { ipc } = ipcDeviceManager.getFocusedResourceAndIPC();
                                ipc === null || ipc === void 0 ? void 0 : ipc.notify("export-selection", { format: "webp" });
                            },
                        },
                    ],
                },
                {
                    type: "separator",
                },
                {
                    label: "Guide: How to Export Design to Code...",
                    click: async () => {
                        const { ipc } = ipcDeviceManager.getFocusedResourceAndIPC();
                        ipc === null || ipc === void 0 ? void 0 : ipc.notify("show-code-mcp-dialog");
                    },
                },
                {
                    label: "Guide: How to Import from Figma...",
                    click: async () => {
                        const device = ipcDeviceManager.getFocusedResource();
                        if (device) {
                            return handleImportFigma(device.getWindow());
                        }
                    },
                },
                {
                    type: "separator",
                },
                {
                    label: "Install 'pencil' CLI...",
                    click: async () => {
                        await electron_1.shell.openExternal("https://docs.pencil.dev/for-developers/pencil-cli");
                    },
                },
                {
                    type: "separator",
                },
                {
                    label: "Save",
                    accelerator: "CmdOrCtrl+S",
                    click: async () => {
                        const { device } = ipcDeviceManager.getFocusedResourceAndIPC();
                        if (device) {
                            await device.saveResource({ userAction: true });
                        }
                    },
                },
                {
                    label: "Save As…",
                    accelerator: "CmdOrCtrl+Shift+S",
                    click: async () => {
                        const { device } = ipcDeviceManager.getFocusedResourceAndIPC();
                        if (device) {
                            await device.saveResource({
                                userAction: true,
                                saveAs: true,
                            });
                        }
                    },
                },
                { type: "separator" },
                ...(!constants_1.IS_MAC
                    ? [
                        settingsItem,
                        { type: "separator" },
                    ]
                    : []),
                { role: "close" },
            ],
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
                { role: "selectAll" },
            ],
        },
        {
            label: "View",
            submenu: [
                {
                    label: "Show/Hide UI",
                    accelerator: "CmdOrCtrl+\\",
                    click: () => {
                        const { ipc } = ipcDeviceManager.getFocusedResourceAndIPC();
                        ipc === null || ipc === void 0 ? void 0 : ipc.notify("toggle-ui-visibility");
                    },
                },
                { type: "separator" },
                { role: "resetZoom" },
                { role: "zoomIn" },
                { role: "zoomOut" },
                { type: "separator" },
                { role: "togglefullscreen" },
                // @ts-expect-error
                ...(constants_1.IS_DEV
                    ? [
                        { role: "reload" },
                        { role: "forceReload" },
                        { role: "toggleDevTools" },
                    ]
                    : [
                        {
                            label: "Toggle Developer Tools",
                            accelerator: "CmdOrCtrl+Shift+Alt+D",
                            visible: false,
                            click: () => {
                                const { device } = ipcDeviceManager.getFocusedResourceAndIPC();
                                if (device) {
                                    device
                                        .getWindow()
                                        .webContents.toggleDevTools();
                                }
                            },
                        },
                    ]),
            ],
        },
        {
            label: "Window",
            submenu: [
                { role: "minimize" },
                { role: "zoom" },
                { type: "separator" },
                {
                    label: "Toggle Light/Dark Mode",
                    click: () => handleToggleTheme(),
                },
                { type: "separator" },
                {
                    label: "Organize Windows into Grid",
                    click: () => organizeWindowsIntoGrid(),
                },
                { type: "separator" },
                // @ts-expect-error
                ...(constants_1.IS_MAC
                    ? [
                        { type: "separator" },
                        { role: "front" },
                        { type: "separator" },
                        { role: "window" },
                    ]
                    : [{ role: "close" }]),
            ],
        },
        {
            role: "help",
            label: "Help",
            submenu: [
                {
                    label: "Pencil Documentation",
                    click: async () => {
                        await electron_1.shell.openExternal("https://docs.pencil.dev");
                    },
                },
                {
                    label: "Prompt Gallery && Tips",
                    click: async () => {
                        await electron_1.shell.openExternal("https://pencil.dev/prompts");
                    },
                },
                {
                    label: "Pencil.dev Website",
                    click: async () => {
                        await electron_1.shell.openExternal("https://pencil.dev");
                    },
                },
                {
                    type: "separator",
                },
                {
                    label: "Cursor Extension",
                    click: async () => {
                        await electron_1.shell.openExternal("cursor:extension/highagency.pencildev");
                    },
                },
                {
                    label: "VSCode Extension",
                    click: async () => {
                        await electron_1.shell.openExternal("https://marketplace.visualstudio.com/items?itemName=highagency.pencildev");
                    },
                },
                {
                    type: "separator",
                },
                {
                    label: "Join Our Discord",
                    click: async () => {
                        await electron_1.shell.openExternal("https://discord.gg/Azsk8cnnVp");
                    },
                },
                ...(!constants_1.IS_MAC
                    ? [
                        { type: "separator" },
                        {
                            label: (0, updater_1.isUpdateDownloaded)()
                                ? "Restart && Install Update"
                                : "Check for Updates…",
                            click: () => (0, updater_1.isUpdateDownloaded)()
                                ? (0, updater_1.quitAndInstallIfUpdateDownloaded)({
                                    forceQuitAndInstall: true,
                                })
                                : handleCheckForUpdates(ipcDeviceManager),
                        },
                        { type: "separator" },
                        { role: "about" },
                    ]
                    : []),
            ],
        },
    ];
    if (process.platform === "darwin") {
        template.unshift({
            label: electron_1.app.name,
            submenu: [
                { role: "about" },
                {
                    label: (0, updater_1.isUpdateDownloaded)()
                        ? "Restart && Install Update"
                        : "Check for Updates…",
                    click: () => (0, updater_1.isUpdateDownloaded)()
                        ? (0, updater_1.quitAndInstallIfUpdateDownloaded)({
                            forceQuitAndInstall: true,
                        })
                        : handleCheckForUpdates(ipcDeviceManager),
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
                { role: "quit" },
            ],
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
        recentFiles,
    };
    const menu = electron_1.Menu.buildFromTemplate(buildApplicationMenuTemplate(menuDependencies));
    electron_1.Menu.setApplicationMenu(menu);
}
function refreshApplicationMenu() {
    if (!menuDependencies) {
        return;
    }
    const menu = electron_1.Menu.buildFromTemplate(buildApplicationMenuTemplate(menuDependencies));
    electron_1.Menu.setApplicationMenu(menu);
}
async function handleCheckForUpdates(ipcDeviceManager) {
    if (constants_1.IS_DEV) {
        return;
    }
    try {
        const isUpdateAvailable = await (0, updater_1.checkForUpdates)();
        const device = ipcDeviceManager.getFocusedResource();
        if (isUpdateAvailable) {
            // If user already choose "install on app quit" we do not show dialog anymore.
            if (!config_1.desktopConfig.get("installOnAppQuit")) {
                ipcDeviceManager.notifyAll("desktop-update-available", {});
            }
        }
        else if (device) {
            electron_1.dialog.showMessageBox(device.getWindow(), {
                type: "info",
                title: "No Updates Available",
                message: "There are currently no updates available.",
            });
        }
    }
    catch (error) {
        logger_1.logger.error("Error checking for updates from menu:", error);
        Sentry.captureException(error);
    }
}
async function handleImportFigma(mainWindow) {
    await electron_1.dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Import from Figma",
        message: "How to import from Figma",
        detail: "1) Copy/Paste: Copy any layer or frame in Figma and paste it onto the canvas in Pencil. Btw: Images are not included.\n\n2) Import .fig file: For a full import including images, export a .fig file from Figma (File > Save local copy) and drag and drop it onto Pencil.\n\nNote: Some advanced graphics features might not yet be supported. Multi-page .fig files are not supported yet (can choose which page to import).",
    });
}
async function handleImportImages(mainWindow, ipc) {
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        title: "Import Image, SVG or Figma",
        filters: [
            {
                name: "Images & Figma",
                extensions: ["png", "jpg", "jpeg", "svg", "fig"],
            },
            { name: "All Files", extensions: ["*"] },
        ],
        properties: ["openFile", "multiSelections"],
    });
    if (!result.canceled && result.filePaths.length > 0) {
        ipc === null || ipc === void 0 ? void 0 : ipc.notify("import-images", { filePaths: result.filePaths });
    }
}
function organizeWindowsIntoGrid() {
    const windows = electron_1.BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
    if (windows.length === 0)
        return;
    const focused = electron_1.BrowserWindow.getFocusedWindow();
    const display = focused
        ? electron_1.screen.getDisplayNearestPoint(focused.getBounds())
        : electron_1.screen.getPrimaryDisplay();
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
            height: cellHeight,
        });
    });
}
