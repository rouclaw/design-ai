"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClaudeCodePackagePath = getClaudeCodePackagePath;
exports.setupClaudeCodeResources = setupClaudeCodeResources;
exports.getClaudeCodeEnv = getClaudeCodeEnv;
exports.getClaudeExecPath = getClaudeExecPath;
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const electron_1 = require("electron");
const config_1 = require("./config");
const constants_1 = require("./constants");
function getClaudeCodePackagePath() {
    if (!electron_1.app.isPackaged) {
        return undefined;
    }
    if (node_os_1.default.platform() === "win32") {
        return node_path_1.default.join(constants_1.CONFIG_FOLDER);
    }
    const appPath = electron_1.app.getAppPath();
    const asarUnpackedPath = appPath.replace(/\.asar$/, ".asar.unpacked");
    return node_path_1.default.join(asarUnpackedPath, "node_modules", "@anthropic-ai", "claude-agent-sdk");
}
async function setupClaudeCodeResources() {
    if (!electron_1.app.isPackaged) {
        return;
    }
    if (node_os_1.default.platform() !== "win32") {
        return;
    }
    const appPath = electron_1.app.getAppPath();
    const asarUnpackedPath = appPath.replace(/\.asar$/, ".asar.unpacked");
    const cliFile = node_path_1.default.join(asarUnpackedPath, "node_modules", "@anthropic-ai", "claude-agent-sdk", "cli.js");
    try {
        node_fs_1.default.mkdirSync(constants_1.CONFIG_FOLDER, { recursive: true });
        await node_fs_1.default.promises.cp(cliFile, node_path_1.default.join(constants_1.CONFIG_FOLDER, "cli.js"));
    }
    catch (_a) { }
}
function getClaudeCodeEnv() {
    const loginType = config_1.desktopConfig.get("claudeLoginType");
    const baseEnv = Object.assign(Object.assign({}, process.env), { ANTHROPIC_BETAS: "fine-grained-tool-streaming-2025-05-14" });
    const customFlags = {};
    switch (loginType) {
        case "api-key":
            customFlags.ANTHROPIC_API_KEY = config_1.desktopConfig.get("claudeApiKey");
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
    return Object.assign(Object.assign({}, baseEnv), customFlags);
}
function getClaudeExecPath() {
    if (!electron_1.app.isPackaged) {
        return undefined;
    }
    const plat = node_os_1.default.platform();
    return node_path_1.default.join(constants_1.APP_FOLDER_PATH, "out", "assets", `bun-${plat}-${node_os_1.default.arch()}${plat === "win32" ? ".exe" : ""}`);
}
