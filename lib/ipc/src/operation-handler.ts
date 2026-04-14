import type { IPCServer } from "@ha/shared";
import type { ToolRequest } from "@ha/ws-server";
import type { ResourceDevice } from "./resource-device.js";

export interface OperationResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
}

export interface OperationHandler {
  readonly operationName: string;

  handle(
    request: ToolRequest,
    context: OperationContext,
  ): Promise<OperationResult>;
}

export interface OperationContext {
  getIPC(filePath: string): Promise<IPCServer | undefined>;
  getDevice(filePath: string): ResourceDevice | undefined;
  emit(event: string, data: unknown): void;
  getLastFocusedResource(): string | null;
  openDocument?(filePath: string): Promise<void>;
  waitForDocumentReady?(filePath: string, timeoutMs?: number): Promise<void>;
}

export interface OperationHandlerFactory {
  createHandler(operationName: string): OperationHandler;
}
