import type { ToolRequest } from "@ha/ws-server";
import { OperationError } from "../operation-errors.js";
import type {
  OperationContext,
  OperationHandler,
  OperationResult,
} from "../operation-handler.js";

export interface ReadFileContentResult {
  content: string;
  filePath: string;
}

export class ReadFileContentHandler implements OperationHandler {
  readonly operationName = "read-file-content";

  async handle(
    request: ToolRequest,
    context: OperationContext,
  ): Promise<OperationResult<ReadFileContentResult>> {
    const { filePath } = request.payload as { filePath?: string };

    if (!filePath) {
      const error = OperationError.invalidPayload("File path is required");
      return {
        success: false,
        error: error.message,
      };
    }

    try {
      const device = context.getDevice(filePath);

      if (!device) {
        const error = OperationError.resourceNotFound(filePath);
        return {
          success: false,
          error: error.message,
        };
      }

      const content = device.getResourceContents();

      return {
        success: true,
        result: {
          content,
          filePath,
        },
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
