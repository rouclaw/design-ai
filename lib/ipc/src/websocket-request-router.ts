import path from "path";
import type { IPCServer } from "@ha/shared";
import type { ResourceDevice } from "./resource-device.js";
import type { ToolRequest } from "@ha/ws-server";
import type { ILogger } from "@ha/shared";
import type {
  OperationContext,
  OperationHandlerFactory,
} from "./operation-handler.js";
import { DefaultOperationHandlerFactory } from "./handlers/operation-handler-factory.js";

export interface WebSocketServerManager {
  on(event: string, handler: (req: ToolRequest) => void): void;
  emit(event: string, data: unknown): void;
  sendResponse(response: {
    client_id: string;
    request_id: string;
    success: boolean;
    result?: unknown;
    error?: string;
  }): void;
}

export class WebSocketRequestRouter {
  private readonly handlerFactory: OperationHandlerFactory;

  constructor(
    private readonly wsServerManager: WebSocketServerManager,
    private readonly getIPC: (
      filePath: string,
    ) => Promise<IPCServer | undefined>,
    private readonly deviceMap: Map<string, ResourceDevice>,
    private readonly getLastFocusedResource: () => string | null,
    private readonly logger: ILogger,
    private readonly openDocument?: (filePath: string) => Promise<void>,
    private readonly waitForDocumentReady?: (
      filePath: string,
      timeoutMs?: number,
    ) => Promise<void>,
    handlerFactory?: OperationHandlerFactory,
  ) {
    this.handlerFactory =
      handlerFactory || new DefaultOperationHandlerFactory();
  }

  start(): void {
    this.wsServerManager.on("tool_request", async (req: ToolRequest) => {
      await this.handleRequest(req);
    });
  }

  private async handleRequest(req: ToolRequest): Promise<void> {
    try {
      if (!req.request_id || !req.client_id) {
        this.logger.error("Invalid request: missing request_id or client_id");
        return;
      }

      const context = this.createContext();
      const handler = this.handlerFactory.createHandler(req.name);
      const result = await handler.handle(req, context);

      this.sendResponse(req, result);

      if (!result.success) {
        this.logger.error(`Failed to execute ${req.name}:`, result.error);
      }
    } catch (error) {
      this.sendErrorResponse(
        req,
        error instanceof Error ? error.message : "Unknown error",
      );
      this.logger.error(`Error handling request ${req.name}:`, error);
    }
  }

  private createContext(): OperationContext {
    return {
      getIPC: (filePath: string) => this.getIPC(filePath),
      getDevice: (filePath: string) => this.findDevice(filePath),
      emit: (event: string, data: unknown) =>
        this.wsServerManager.emit(event, data),
      getLastFocusedResource: () => this.getLastFocusedResource(),
      openDocument: this.openDocument,
      waitForDocumentReady: this.waitForDocumentReady,
    };
  }

  private findDevice(filePath: string): ResourceDevice | undefined {
    if (this.deviceMap.has(filePath)) {
      return this.deviceMap.get(filePath);
    }

    const resolvedPath = path.resolve(filePath);
    if (this.deviceMap.has(resolvedPath)) {
      return this.deviceMap.get(resolvedPath);
    }

    for (const [resourcePath, device] of this.deviceMap) {
      if (
        resourcePath === filePath ||
        path.resolve(resourcePath) === resolvedPath
      ) {
        return device;
      }
    }

    return undefined;
  }

  private sendResponse(
    req: ToolRequest,
    result: { success: boolean; result?: unknown; error?: string },
  ): void {
    this.wsServerManager.sendResponse({
      client_id: req.client_id,
      request_id: req.request_id,
      success: result.success,
      result: result.result,
      error: result.error,
    });
  }

  private sendErrorResponse(req: ToolRequest, error: string): void {
    this.wsServerManager.sendResponse({
      client_id: req.client_id,
      request_id: req.request_id,
      success: false,
      error,
    });
  }
}
