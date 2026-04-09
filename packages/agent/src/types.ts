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
	state: (event: { status: string; message: string; data?: object }) => void;
	stopped: () => void;
	completed: (payload: { response: string; error?: string }) => void;
	failed: (payload: { message: string; error?: string }) => void;
	"batch-design": (event: {
		filePath: string;
		operations: string;
		id: string;
		partial?: boolean;
	}) => void;
	"tool-use-start": (event: { name: string; id: string }) => void;
	"chat-session": (event: { sessionId: string }) => void;
	"chat-agent-message": (event: {
		content: Array<{
			type: string;
			text?: string;
			name?: string;
			input?: unknown;
		}>;
	}) => void;
	"chat-tool-use": (event: {
		toolName: string;
		toolInput: unknown;
		toolUseId?: string;
	}) => void;
	"chat-tool-result": (event: {
		toolUseId: string;
		toolOutput: unknown;
		isError: boolean;
	}) => void;
	"spawn-agents": (event: {
		filePath: string;
		agentsConfig: object[];
		id: string;
		partial?: boolean;
	}) => void;
	"thinking-update": (event: { text: string }) => void;
	"permission-request": (event: {
		toolName: string;
		input: Record<string, unknown>;
		resolve: (result: "allow" | "always-allow" | "deny") => void;
	}) => void;
};

export interface PencilAgent extends EventEmitter<PencilAgentEvents> {
	execute(prompt: string, files?: FileAttachment[]): Promise<void>;
	stop(): Promise<void>;
}
