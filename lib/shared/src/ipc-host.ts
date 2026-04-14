import type {
  IPCHandler,
  IPCMessage,
  IPCNotificationHandler,
  IPCServer,
  MessageId,
} from "./ipc-types";
import { IPCError } from "./ipc-types";
import type { ILogger } from "./logger";

export class IPCHost implements IPCServer {
  private requestHandlers = new Map<string, IPCHandler<any, any>>();
  private notificationHandlers = new Map<
    string,
    IPCNotificationHandler<any>[]
  >();
  private pendingRequests = new Map<
    MessageId,
    {
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
      timeout?: ReturnType<typeof setTimeout>;
    }
  >();
  private messageIdCounter = 0;
  private onMessageReceivedHandler: (
    callback: (message: IPCMessage) => void,
  ) => void;
  private sendMessageHandler: (message: IPCMessage) => void;

  constructor(
    onMessageReceivedHandler: (callback: (message: IPCMessage) => void) => void,
    sendMessageHandler: (message: IPCMessage) => void,
    private readonly logger: ILogger,
  ) {
    this.onMessageReceivedHandler = onMessageReceivedHandler;
    this.sendMessageHandler = sendMessageHandler;
    this.logger.info("Initializing IPC server");
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    this.onMessageReceivedHandler((message: IPCMessage) => {
      this.handleMessage(message).catch((error) => {
        this.logger.error("Error handling IPC message:", error);
      });
    });
  }

  private async handleMessage(message: IPCMessage): Promise<void> {
    this.logger.debug(`Received ${message.type}: ${message.method}`, {
      id: message.id,
      hasPayload: !!message.payload,
    });

    switch (message.type) {
      case "notification":
        this.handleNotification(message);
        break;
      case "request":
        return this.handleRequest(message);
      case "response":
        this.handleResponse(message);
        break;
    }
  }

  private handleNotification(message: IPCMessage): void {
    const handlers = this.notificationHandlers.get(message.method) || [];
    this.logger.debug(
      `Handling notification '${message.method}' with ${handlers.length} handlers`,
    );

    handlers.forEach((handler) => {
      try {
        handler(message.payload);
      } catch (error) {
        this.logger.error(
          `Error in notification handler for '${message.method}':`,
          error,
        );
      }
    });
  }

  private async handleRequest(message: IPCMessage): Promise<void> {
    const handler = this.requestHandlers.get(message.method);

    if (!handler) {
      this.sendResponse(message.id, message.method, undefined, {
        code: "METHOD_NOT_FOUND",
        message: `No handler found for method '${message.method}'`,
      });
      return;
    }

    try {
      const result = await handler(message.payload);
      this.sendResponse(message.id, message.method, result);
    } catch (error) {
      const ipcError =
        error instanceof IPCError
          ? error
          : new IPCError(
              "HANDLER_ERROR",
              error instanceof Error ? error.message : "Unknown error",
              error instanceof Error ? error.stack : "Unknown stack trace",
            );

      this.sendResponse(message.id, message.method, undefined, {
        code: ipcError.code,
        message: ipcError.message,
        stack: ipcError.stack,
      });
    }
  }

  private handleResponse(message: IPCMessage): void {
    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      this.logger.warn(
        `Received response for unknown request ID: ${message.id}`,
      );
      return;
    }

    this.pendingRequests.delete(message.id);
    clearTimeout(pending.timeout);

    if (message.error) {
      const error = new IPCError(
        message.error.code,
        message.error.message,
        message.error.stack,
      );
      pending.reject(error);
    } else {
      pending.resolve(message.payload);
    }
  }

  private generateMessageId(): MessageId {
    return `ext-${++this.messageIdCounter}-${Date.now()}`;
  }

  private sendMessage(message: IPCMessage): void {
    this.logger.debug(`Sending ${message.type}: ${message.method}`, {
      id: message.id,
      hasPayload: !!message.payload,
    });
    this.sendMessageHandler(message);
  }

  private sendResponse(
    id: MessageId,
    method: string,
    payload?: unknown,
    error?: { code: string; message: string; stack?: string },
  ): void {
    this.sendMessage({
      id,
      type: "response",
      method,
      payload,
      error,
    });
  }

  // IPCServer interface implementation
  notify<T = unknown>(method: string, payload?: T): void {
    this.logger.debug(`Sending notification '${method}'`);
    this.sendMessage({
      id: this.generateMessageId(),
      type: "notification",
      method,
      payload,
    });
  }

  async request<TRequest = unknown, TResponse = unknown>(
    method: string,
    payload?: TRequest,
    timeoutMs = 60000,
  ): Promise<TResponse> {
    this.logger.debug(`Sending request '${method}' (timeout: ${timeoutMs}ms)`);

    return new Promise((resolve, reject) => {
      const id = this.generateMessageId();

      const timeout =
        timeoutMs >= 0
          ? setTimeout(() => {
              this.pendingRequests.delete(id);
              this.logger.warn(
                `Request '${method}' timed out after ${timeoutMs}ms`,
              );
              reject(
                new IPCError(
                  "TIMEOUT",
                  `Request '${method}' timed out after ${timeoutMs}ms`,
                ),
              );
            }, timeoutMs)
          : undefined;

      this.pendingRequests.set(id, { resolve, reject, timeout });

      this.sendMessage({
        id,
        type: "request",
        method,
        payload,
      });
    });
  }

  on<T = unknown>(method: string, handler: IPCNotificationHandler<T>): void {
    this.logger.debug(`Registering notification handler for '${method}'`);
    if (!this.notificationHandlers.has(method)) {
      this.notificationHandlers.set(method, []);
    }
    this.notificationHandlers
      .get(method)
      ?.push(handler as IPCNotificationHandler<any>);
  }

  off<T = unknown>(method: string, handler: IPCNotificationHandler<T>): void {
    const handlers = this.notificationHandlers.get(method);
    if (handlers) {
      const index = handlers.indexOf(handler as IPCNotificationHandler<any>);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.notificationHandlers.delete(method);
      }
    }
  }

  handle<TRequest = unknown, TResponse = unknown>(
    method: string,
    handler: IPCHandler<TRequest, TResponse>,
  ): void {
    this.logger.debug(`Registering handler for '${method}'`);
    this.requestHandlers.set(method, handler as IPCHandler<any, any>);
  }

  unhandle(method: string): void {
    this.requestHandlers.delete(method);
  }

  dispose(): void {
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new IPCError("DISPOSED", "IPC server was disposed"));
    });
    this.pendingRequests.clear();
    this.requestHandlers.clear();
    this.notificationHandlers.clear();
  }
}
