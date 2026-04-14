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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUpdateDownloaded = isUpdateDownloaded;
exports.setupUpdater = setupUpdater;
exports.checkForUpdates = checkForUpdates;
exports.handleUpdaterNotifications = handleUpdaterNotifications;
exports.quitAndInstallIfUpdateDownloaded = quitAndInstallIfUpdateDownloaded;
const Sentry = __importStar(require("@sentry/electron/main"));
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const config_1 = require("./config");
const menu_1 = require("./menu");
let _isUpdateDownloaded = false;
function isUpdateDownloaded() {
    return _isUpdateDownloaded;
}
async function setupUpdater(ipcDeviceManager) {
    const log = require("electron-log");
    log.transports.file.level = "debug";
    electron_updater_1.autoUpdater.logger = log;
    electron_updater_1.autoUpdater.autoInstallOnAppQuit = false;
    electron_updater_1.autoUpdater.on("update-downloaded", (_info) => {
        _isUpdateDownloaded = true;
        (0, menu_1.refreshApplicationMenu)();
        // If user already choose "install on app quit" we do not show dialog anymore.
        if (!config_1.desktopConfig.get("installOnAppQuit")) {
            ipcDeviceManager.notifyAll("desktop-update-ready", {});
        }
    });
    // Check for updates every 30 minutes.
    setInterval(async () => {
        try {
            await checkForUpdates();
        }
        catch (error) {
            log.error("Error checking for updates during periodic check:", error);
            Sentry.captureException(error);
        }
    }, 30 * 60 * 1000);
    try {
        await checkForUpdates();
    }
    catch (error) {
        log.error("Error checking for updates during setup:", error);
        Sentry.captureException(error);
    }
}
async function checkForUpdates() {
    let updateCheckResult;
    if (electron_1.net.isOnline()) {
        try {
            updateCheckResult = await electron_updater_1.autoUpdater.checkForUpdates();
            if (updateCheckResult === null || updateCheckResult === void 0 ? void 0 : updateCheckResult.downloadPromise) {
                updateCheckResult.downloadPromise.catch((error) => {
                    var _a;
                    // Let's ignore all network errors.
                    if ((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.toUpperCase().includes("NET::ERR")) {
                        return;
                    }
                    // Rethrow only if user was online so it will be different
                    // error than getting offline while downloading.
                    if (electron_1.net.isOnline()) {
                        throw error;
                    }
                });
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Let's ignore all network errors.
            if (errorMessage.toUpperCase().includes("NET::ERR")) {
                return false;
            }
            // Rethrow only if user was online so it will be different
            // error than getting offline while downloading.
            if (electron_1.net.isOnline()) {
                throw error;
            }
        }
    }
    return updateCheckResult ? updateCheckResult.isUpdateAvailable : false;
}
function handleUpdaterNotifications(ipc) {
    ipc.on("desktop-update-install", () => {
        config_1.desktopConfig.set("installOnAppQuit", false);
        _isUpdateDownloaded = false;
        electron_updater_1.autoUpdater.quitAndInstall(false, true);
    });
    ipc.on("set-install-on-app-quit", () => {
        config_1.desktopConfig.set("installOnAppQuit", true);
    });
}
function quitAndInstallIfUpdateDownloaded(params = {}) {
    if (_isUpdateDownloaded &&
        (config_1.desktopConfig.get("installOnAppQuit") || params.forceQuitAndInstall)) {
        config_1.desktopConfig.set("installOnAppQuit", false);
        _isUpdateDownloaded = false;
        electron_updater_1.autoUpdater.quitAndInstall(false, false);
    }
    else {
        config_1.desktopConfig.set("installOnAppQuit", false);
        _isUpdateDownloaded = false;
        electron_1.app.quit();
    }
}
