import type { AgentSessionEvent } from "@ha/shared";
import type EventEmitter from "eventemitter3";

// Re-export MCP types from @ha/mcp
export type {
  MCPRemoteServerConfig,
  MCPServerConfig,
  MCPStdioServerConfig,
} from "@ha/mcp";

interface Base64ImageSource {
  data: string;
  media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  type: "base64";
}

export type FileAttachment =
  | {
      type: "image";
      name: string;
      path?: string;
      source: Base64ImageSource;
    }
  | {
      type: "text";
      name: string;
      content: string;
    };

export type PencilAgentEvents = {
  "session-event": (event: AgentSessionEvent) => void;
};

export interface PencilAgent extends EventEmitter<PencilAgentEvents> {
  execute(prompt: string, files?: FileAttachment[]): Promise<void>;
  stop(): Promise<void>;
}
