export enum OperationErrorCode {
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  IPC_NOT_AVAILABLE = "IPC_NOT_AVAILABLE",
  INVALID_PAYLOAD = "INVALID_PAYLOAD",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export class OperationError extends Error {
  constructor(
    public readonly code: OperationErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "OperationError";
  }

  static fromError(error: unknown, defaultCode = OperationErrorCode.UNKNOWN_ERROR): OperationError {
    if (error instanceof OperationError) {
      return error;
    }

    if (error instanceof Error) {
      return new OperationError(defaultCode, error.message, { originalError: error.name });
    }

    return new OperationError(defaultCode, String(error));
  }

  static resourceNotFound(resourcePath: string): OperationError {
    return new OperationError(
      OperationErrorCode.RESOURCE_NOT_FOUND,
      `Resource not found: ${resourcePath}`,
      { resourcePath },
    );
  }

  static ipcNotAvailable(resourcePath: string): OperationError {
    return new OperationError(
      OperationErrorCode.IPC_NOT_AVAILABLE,
      `Failed to access file ${resourcePath}. A file needs to be open in the editor to perform this action.`,
      { resourcePath },
    );
  }

  static invalidPayload(message: string, details?: unknown): OperationError {
    return new OperationError(OperationErrorCode.INVALID_PAYLOAD, message, details);
  }
}
