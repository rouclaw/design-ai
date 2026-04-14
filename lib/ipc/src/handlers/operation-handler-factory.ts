import type {
  OperationHandler,
  OperationHandlerFactory,
} from "../operation-handler";
import { IPCRequestHandler } from "./ipc-request-handler";
import { OpenDocumentHandler } from "./open-document-handler";
import { ReadFileContentHandler } from "./read-file-content-handler";

export class DefaultOperationHandlerFactory implements OperationHandlerFactory {
  private readonly handlers = new Map<string, OperationHandler>();

  constructor() {
    this.handlers.set("read-file-content", new ReadFileContentHandler());
    this.handlers.set("open-document", new OpenDocumentHandler());

    this.handlers.set(
      "export-viewport",
      new IPCRequestHandler("export-viewport"),
    );
  }

  createHandler(operationName: string): OperationHandler {
    return (
      this.handlers.get(operationName) || new IPCRequestHandler(operationName)
    );
  }
}
