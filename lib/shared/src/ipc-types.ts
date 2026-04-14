/**
 * Shared types for IPC communication between VSCode extension and webview
 */

export type MessageId = string;

export interface IPCMessage<T = unknown> {
  id: MessageId;
  type: "notification" | "request" | "response";
  method: string;
  payload?: T;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}

export interface IPCNotification<T = unknown>
  extends Omit<IPCMessage<T>, "type"> {
  type: "notification";
}

export interface IPCRequest<T = unknown> extends Omit<IPCMessage<T>, "type"> {
  type: "request";
}

export interface IPCResponse<T = unknown> extends Omit<IPCMessage<T>, "type"> {
  type: "response";
}

export interface IPCHandler<TRequest = unknown, TResponse = unknown> {
  (payload: TRequest): Promise<TResponse> | TResponse;
}

export interface IPCNotificationHandler<T = unknown> {
  (payload: T): void;
}

export interface IPCEventEmitter {
  on<T = unknown>(method: string, handler: IPCNotificationHandler<T>): void;
  off<T = unknown>(method: string, handler: IPCNotificationHandler<T>): void;
  emit<T = unknown>(method: string, payload: T): void;
}

export interface IPCRequestHandler {
  handle<TRequest = unknown, TResponse = unknown>(
    method: string,
    handler: IPCHandler<TRequest, TResponse>,
  ): void;
  unhandle(method: string): void;
}

export interface IPCClient {
  /**
   * Send a notification (fire-and-forget)
   */
  notify<T = unknown>(method: string, payload?: T): void;

  /**
   * Send a request and wait for response
   */
  request<TRequest = unknown, TResponse = unknown>(
    method: string,
    payload?: TRequest,
  ): Promise<TResponse>;

  /**
   * Listen for notifications
   */
  on<T = unknown>(method: string, handler: IPCNotificationHandler<T>): void;

  /**
   * Remove notification listener
   */
  off<T = unknown>(method: string, handler: IPCNotificationHandler<T>): void;
}

export interface IPCServer extends IPCClient {
  /**
   * Handle incoming requests
   */
  handle<TRequest = unknown, TResponse = unknown>(
    method: string,
    handler: IPCHandler<TRequest, TResponse>,
  ): void;

  /**
   * Remove request handler
   */
  unhandle(method: string): void;
}

export class IPCError extends Error {
  constructor(
    public code: string,
    message: string,
    stack?: string,
  ) {
    super(message);
    this.name = "IPCError";
    if (stack) {
      this.stack = stack;
    }
  }
}
