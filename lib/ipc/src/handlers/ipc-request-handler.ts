import type { ToolRequest } from "@ha/ws-server";
import { OperationError } from "../operation-errors.js";
import type {
  OperationContext,
  OperationHandler,
  OperationResult,
} from "../operation-handler.js";

export class IPCRequestHandler implements OperationHandler {
  constructor(public readonly operationName: string) {}

  async handle(
    request: ToolRequest,
    context: OperationContext,
  ): Promise<OperationResult> {
    const { filePath, ...params } = request.payload as {
      filePath?: string;
    };

    const ipc = await context.getIPC(filePath || "");
    if (!ipc) {
      const error = OperationError.ipcNotAvailable(filePath || "");
      return {
        success: false,
        error: error.message,
      };
    }

    try {
      const result = (await ipc.request(this.operationName, params)) as any;

      return {
        success: result.success ?? true,
        result: result.success ? result.result : undefined,
        error: result.error,
      };
    } catch (error) {
      const operationError = OperationError.fromError(error);
      return {
        success: false,
        error: operationError.message,
      };
    }
  }
}
