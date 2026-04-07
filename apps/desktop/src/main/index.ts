import * as fs from "node:fs";
import * as path from "node:path";
import { app, dialog, net, protocol } from "electron";
import { parseAgentExecuteConfig } from "./agent-execute-config";
import { PencilApp, type PencilInitArgs } from "./app";
import { APP_PROTOCOL, IS_DEV, IS_MAC } from "./constants";
import { logger } from "./logger";
import { quitAndInstallIfUpdateDownloaded } from "./updater";

let initArgs = getInitArgs();
let pencilApp: PencilApp | undefined;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    const focusedWindow = pencilApp?.getFocusedWindow();
    if (focusedWindow) {
      if (focusedWindow.isMinimized()) {
        focusedWindow.restore();
      }
      focusedWindow.focus();
    }

    const args = commandLine.slice(app.isPackaged ? 1 : 2);
    const fileArg = args.find((arg) => arg.endsWith(".pen"));
    if (fileArg && pencilApp) {
      const resolvedPath = resolveFilePath(fileArg);
      if (fs.existsSync(resolvedPath)) {
        pencilApp.loadFile(resolvedPath, true);
      }
    }
  });
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

app.whenReady().then(async () => {
  logger.info(`App ready. IS_DEV: ${IS_DEV}, NODE_ENV: ${process.env.NODE_ENV}`);

  if (!IS_DEV && IS_MAC && isRunningFromDmg()) {
    dialog.showMessageBoxSync({
      type: "error",
      buttons: ["OK"],
      message: "Please install app before launching",
    });
    app.quit();
    return;
  }

  if (!IS_DEV) {
    protocol.handle(APP_PROTOCOL, (request) => {
      try {
        const rendererDir = path.join(__dirname, "..", "renderer");
        const url = new URL(request.url);
        const filePath = url.pathname;
        let targetFile: string;

        if (filePath === "/" || filePath === "/editor" || filePath === "") {
          targetFile = path.join(rendererDir, "index.html");
        } else {
          const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
          targetFile = path.join(rendererDir, cleanPath);
        }

        const resolvedRendererDir = path.resolve(rendererDir);
        const resolvedTargetFile = path.resolve(targetFile);
        if (!resolvedTargetFile.startsWith(resolvedRendererDir + path.sep)) {
          throw new Error(`Invalid protocol path: ${filePath}`);
        }

        return net.fetch(`file://${targetFile}`);
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

app.on("window-all-closed", async () => {
  if (pencilApp) {
    await pencilApp.cleanup();
  }
  quitAndInstallIfUpdateDownloaded();
});

app.on("open-file", async (event, filePath) => {
  logger.info("open-file", event, filePath);
  event.preventDefault();

  if (path.extname(filePath) !== ".pen") {
    return;
  }

  if (pencilApp) {
    pencilApp.loadFile(filePath, true);
  } else {
    initArgs = { filePath };
  }
});

function resolveFilePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(process.cwd(), filePath);
}

function getInitArgs(): PencilInitArgs {
  const argIndex = app.isPackaged ? 1 : 2;
  const args = process.argv.slice(argIndex);
  if (args.length === 0) {
    return undefined;
  }

  const result: NonNullable<PencilInitArgs> = {};

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
      const filePath = args[i + 1]!;
      const resolvedPath = resolveFilePath(filePath);
      if (fs.existsSync(resolvedPath) && path.extname(resolvedPath) === ".pen") {
        result.filePath = resolvedPath;
      } else {
        logger.error(`Error: File not found or invalid: ${filePath}`);
        app.quit();
        return undefined;
      }
      i++;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function isRunningFromDmg(): boolean {
  const appPath = app.getAppPath();
  if (!appPath.startsWith("/Volumes/")) return false;
  if (!appPath.includes(".app")) return false;

  const pathToCheck = path.join(appPath.split(".app")[0]!, ".app");
  try {
    fs.accessSync(pathToCheck, fs.constants.W_OK);
    return false;
  } catch {
    return true;
  }
}
