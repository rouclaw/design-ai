import type { ILogger } from "@ha/shared";
import * as crypto from "node:crypto";
import { EventEmitter } from "node:events";
import { type WebSocket, WebSocketServer } from "ws";

export interface ToolRequest {
  client_id: string;
  request_id: string;
  name: string;
  payload: object;
}

export interface ToolResponse {
  client_id: string;
  request_id: string;
  success: boolean;
  error?: string;
  result?: object;
}

interface ConnectedClient {
  socket: WebSocket;
}

export class WebSocketServerManager extends EventEmitter {
  private wsServer: WebSocketServer | null = null;
  private wsPort: number = 0;
  private connectedClients: Map<string, ConnectedClient> = new Map();

  constructor(
    private readonly logger: ILogger,
    private readonly preferredPort?: number,
  ) {
    super();
  }

  public start(): void {
    if (this.wsServer) {
      this.logger.warn("WebSocket server already running");
      return;
    }

    this.wsServer = new WebSocketServer({
      host: "localhost",
      port: this.preferredPort || 0,
    });

    this.wsServer.on("listening", () => {
      const address = this.wsServer?.address();

      if (typeof address === "object" && address) {
        this.wsPort = address.port;
        this.logger.info(`WebSocket server listening on port ${this.wsPort}`);

        this.emit("ready", this.wsPort);
      }
    });

    this.wsServer.on("connection", (ws: WebSocket) => {
      this.handleNewConnection(ws);
    });

    this.wsServer.on("error", (error) => {
      this.logger.error("WebSocket server error:", error);
    });
  }

  private handleNewConnection(socket: WebSocket) {
    const clientId = crypto.randomUUID();
    this.logger.info(`New MCP client connected with ID: ${clientId}`);

    // Send client ID to the connecting client
    const customResponse: ToolResponse = {
      request_id: "client-id-assignment",
      success: true,
      client_id: clientId,
    };
    socket.send(JSON.stringify(customResponse));

    this.connectedClients.set(clientId, { socket });

    socket.on("message", (data: any) => {
      try {
        const message = JSON.parse(data.toString());

        this.emit("tool_request", message);
      } catch (error) {
        this.logger.error("Invalid WebSocket message:", error);
      }
    });

    socket.on("close", () => {
      this.logger.info(`MCP client disconnected: ${clientId}`);
      this.connectedClients.delete(clientId);
    });

    socket.on("error", (error: any) => {
      this.logger.error(`WebSocket error for client ${clientId}:`, error);
      this.connectedClients.delete(clientId);
    });
  }

  sendResponse(response: ToolResponse): void {
    const clientId = response.client_id;
    const client = this.connectedClients.get(clientId);

    if (client && client.socket.readyState === client.socket.OPEN) {
      client.socket.send(JSON.stringify(response));
    } else {
      this.logger.warn(
        `Cannot send message to client ${clientId}: not connected`,
      );
    }
  }

  stop(): void {
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }

    this.connectedClients.clear();
  }

  getPort(): number {
    return this.wsPort;
  }
}
