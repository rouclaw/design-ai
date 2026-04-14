"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.desktopConfig = void 0;
exports.getWindowBackgroundColor = getWindowBackgroundColor;
const electron_store_1 = __importDefault(require("electron-store"));
const desktop_mcp_adapter_1 = require("./desktop-mcp-adapter");
const defaults = {
    windowBounds: {
        width: 1200,
        height: 800,
        x: undefined,
        y: undefined,
    },
    recentFiles: [],
    claudeApiKey: undefined,
    claudeLoginType: "subscription",
    enabledIntegrations: desktop_mcp_adapter_1.DesktopMCPAdapter.getSupportedIntegrations(),
    codexApiKey: undefined,
    codexLoginType: "subscription",
    workspaceFolders: {},
    installOnAppQuit: undefined,
    windowVibrancy: process.platform === "darwin" && process.arch === "arm64",
};
const store = new electron_store_1.default({
    defaults,
});
class DesktopConfig {
    constructor(store) {
        this.store = store;
    }
    // Since entire store is one json file, if there is malformed value, entire store
    // is "broken" so we must clear it.
    handleMalformedStore(error) {
        const errorName = error instanceof Error ? error.name : String(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (error instanceof SyntaxError ||
            errorName === "SyntaxError" ||
            // Covers both expected and unexpected.
            errorMessage.toLowerCase().includes("expected")) {
            // @ts-expect-error
            this.store.clear();
            return true;
        }
        return false;
    }
    get(key) {
        try {
            // @ts-expect-error
            return this.store.get(key);
        }
        catch (error) {
            if (this.handleMalformedStore(error)) {
                return defaults[key];
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Let's ignore permission issues and return default value instead.
            if (errorMessage.toLowerCase().includes("eperm")) {
                return defaults[key];
            }
            throw error;
        }
    }
    delete(key) {
        try {
            // @ts-expect-error
            this.store.delete(key);
        }
        catch (error) {
            if (this.handleMalformedStore(error)) {
                return;
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Let's ignore permission issues.
            if (errorMessage.toLowerCase().includes("eperm")) {
                return;
            }
            throw error;
        }
    }
    set(key, value) {
        try {
            // @ts-expect-error
            this.store.set(key, value);
        }
        catch (error) {
            if (this.handleMalformedStore(error)) {
                // @ts-expect-error
                this.store.set(key, value);
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Let's ignore permission issues.
            if (errorMessage.toLowerCase().includes("eperm")) {
                return;
            }
            // Let's ignore out-of-space issues.
            if (errorMessage.toLowerCase().includes("enospc")) {
                return;
            }
            throw error;
        }
    }
}
exports.desktopConfig = new DesktopConfig(store);
function getWindowBackgroundColor(vibrancy, isDark) {
    if (vibrancy)
        return "#00000000";
    return isDark ? "#3e3d3d" : "#e8e8e8";
}
