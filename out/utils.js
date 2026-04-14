"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFilePathForPencilURI = getFilePathForPencilURI;
const node_path_1 = __importDefault(require("node:path"));
const electron_1 = require("electron");
function getFilePathForPencilURI(uri) {
    return node_path_1.default.join(electron_1.app.getAppPath(), "out", "data", uri.substring("pencil:".length));
}
