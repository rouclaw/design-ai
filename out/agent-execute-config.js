"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAgentExecuteConfig = parseAgentExecuteConfig;
exports.openWithAgentExecuteConfig = openWithAgentExecuteConfig;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const shared_1 = require("@ha/shared");
const config_1 = require("./config");
const logger_1 = require("./logger");
const EXTENSION_TO_MEDIA_TYPE = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
};
function resolveAttachments(attachments, basePath) {
    const result = [];
    for (const attachment of attachments) {
        const resolvedPath = node_path_1.default.isAbsolute(attachment)
            ? attachment
            : node_path_1.default.resolve(basePath, attachment);
        if (!node_fs_1.default.existsSync(resolvedPath)) {
            logger_1.logger.warn(`Attachment file does not exist: ${resolvedPath}, skipping.`);
            continue;
        }
        const ext = node_path_1.default.extname(resolvedPath).toLowerCase();
        const name = node_path_1.default.basename(resolvedPath);
        if (ext in EXTENSION_TO_MEDIA_TYPE) {
            const data = node_fs_1.default.readFileSync(resolvedPath).toString("base64");
            result.push({
                type: "image",
                name,
                source: {
                    data,
                    media_type: EXTENSION_TO_MEDIA_TYPE[ext],
                    type: "base64",
                },
            });
        }
        else {
            const content = node_fs_1.default.readFileSync(resolvedPath, "utf-8");
            result.push({
                type: "text",
                name,
                content,
            });
        }
    }
    return result;
}
function parseAgentExecuteConfig(configString) {
    try {
        return JSON.parse(configString);
    }
    catch (_a) {
        try {
            const filePath = node_path_1.default.isAbsolute(configString)
                ? configString
                : node_path_1.default.resolve(process.cwd(), configString);
            const fileContent = node_fs_1.default.readFileSync(filePath, "utf-8");
            return JSON.parse(fileContent);
        }
        catch (_b) {
            return undefined;
        }
    }
}
async function openWithAgentExecuteConfig(ipcDeviceManager, loadFile, config) {
    for (const c of config) {
        const filePath = node_path_1.default.isAbsolute(c.file)
            ? c.file
            : node_path_1.default.resolve(process.cwd(), c.file);
        if (!node_fs_1.default.existsSync(filePath)) {
            logger_1.logger.warn(`File does not exist: ${filePath}, skipping.`);
            continue;
        }
        await loadFile(filePath, true);
        await ipcDeviceManager.waitForDocumentReady(filePath);
        const ipc = await ipcDeviceManager.getIPC(filePath);
        if (!ipc) {
            logger_1.logger.warn(`Failed to get IPC for file: ${filePath}`);
            continue;
        }
        const loginType = config_1.desktopConfig.get("claudeLoginType");
        if (loginType === undefined) {
            logger_1.logger.warn("Cannot prompt agent: Claude login type is not set.");
        }
        const files = c.attachments && c.attachments.length > 0
            ? resolveAttachments(c.attachments, process.cwd())
            : undefined;
        ipc.notify("prompt-agent", {
            prompt: c.prompt,
            modelID: loginType
                ? (0, shared_1.mapCanvasModelsToThirdParty)("claude", loginType, c.model)
                : undefined,
            files,
        });
    }
}
