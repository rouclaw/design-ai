"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCodexPackagePath = getCodexPackagePath;
const node_path_1 = __importDefault(require("node:path"));
const electron_1 = require("electron");
function getCodexPackagePath() {
    if (!electron_1.app.isPackaged) {
        return undefined;
    }
    const appPath = electron_1.app.getAppPath();
    const asarUnpackedPath = appPath.replace(/\.asar$/, ".asar.unpacked");
    return node_path_1.default.join(asarUnpackedPath, "node_modules", "@openai", "codex-sdk");
}
