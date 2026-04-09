import type { ILogger } from "@ha/shared";
import type { MCPServerConfig } from "./types.js";

/**
 * Unified configuration for all agents (Claude, Codex)
 */
export interface AgentConfig {
	/** Logger instance for tracking execution */
	logger: ILogger;

	/**
	 * Model to use.
	 * - Claude: "claude-sonnet-4-5-20250929", "claude-haiku-4-5", etc.
	 * - Codex: "o1", "o1-preview", etc.
	 */
	model?: string;

	/**
	 * System prompt to provide context to the agent.
	 * - Claude: Appended to the default system prompt
	 * - Codex: Used as system prompt
	 */
	systemPrompt?: string;

	/**
	 * Maximum number of turns/iterations.
	 * - Claude: maxTurns (default: 500)
	 * - Codex: maxTurns (default: 100)
	 */
	maxTurns?: number;

	/**
	 * MCP servers to register and use.
	 * - Claude: Uses mcpServers in agent SDK
	 * - Codex: Registers via CLI
	 */
	mcpServers?: MCPServerConfig[];

	/**
	 * Path to the .pen file.
	 * - Claude: Optional. If omitted, uses process.cwd()/tmp as working directory.
	 * - Codex: Optional. Used to set working directory (parent directory of the file).
	 */
	filePath?: string;

	/**
	 * Session ID for resuming a previous conversation.
	 * - Claude: Used with the `resume` option in the Agent SDK to continue a session.
	 * - Codex: Not used.
	 */
	sessionId?: string;

	packagePath?: string;

	execPath?: string;

	env?: {
		[envVar: string]: string | undefined;
	};

	includePartialMessages?: boolean;

	apiKey?: string;

	cwd?: string;

	disallowedTools?: string[];

	conversationId?: string;

	/**
	 * When true, skip all permission checks and run in fully autonomous mode.
	 * - Claude: Sets allowDangerouslySkipPermissions + permissionMode "bypassPermissions"
	 * - Codex: Sets sandboxMode "danger-full-access" + approvalPolicy "never"
	 */
	dangerouslySkipPermissions?: boolean;
}

/**
 * Result from agent execution
 */
export interface AgentResult {
	/** Whether execution was successful */
	success: boolean;

	/** Final status of the execution */
	status: "completed" | "stopped" | "failed";

	/** Error message if failed */
	error?: string;

	/** Final response from the agent (last message content) */
	response?: string;
}
