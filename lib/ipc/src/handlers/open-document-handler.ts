import type { ToolRequest } from "@ha/ws-server";
import type {
  OperationContext,
  OperationHandler,
  OperationResult,
} from "../operation-handler.js";
import { NEW_DOC_TYPES } from "../constants.js";

export class OpenDocumentHandler implements OperationHandler {
  readonly operationName = "open-document";

  async handle(
    request: ToolRequest,
    context: OperationContext,
  ): Promise<OperationResult> {
    const { filePathOrTemplate } = request.payload as {
      filePathOrTemplate?: string;
    };
    const targetPath = filePathOrTemplate || "new";

    if (!context.openDocument) {
      return { success: false, error: "openDocument not available" };
    }

    try {
      await context.openDocument(targetPath);

      if (context.waitForDocumentReady && !NEW_DOC_TYPES.includes(targetPath)) {
        await context.waitForDocumentReady(targetPath);
      }

      return { success: true, result: { message: "Document opened" } };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to open document",
      };
    }
  }
}
