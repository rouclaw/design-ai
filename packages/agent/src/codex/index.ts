import * as os from "node:os";
import * as path from "node:path";
import type { ThreadOptions, UserInput } from "@openai/codex-sdk";
import { EventEmitter } from "eventemitter3";
import type { AgentConfig } from "../config.js";
import type {
	FileAttachment,
	PencilAgent,
	PencilAgentEvents,
} from "../types.js";

// Message event from the agent during execution
export interface CodexAgentMessage {
	type: "assistant" | "result" | "tool_use";
	content?: unknown;
	status?: string;
	message?: string;
}

// Type imported dynamically to avoid CJS/ESM compatibility issues
type Thread = Awaited<
	ReturnType<import("@openai/codex-sdk").Codex["startThread"]>
>;

export class CodexAgent
	extends EventEmitter<PencilAgentEvents>
	implements PencilAgent
{
	private config: AgentConfig;
	private thread: Thread | undefined = undefined;
	private abortController: AbortController | undefined = undefined;

	constructor(config: AgentConfig) {
		super();

		this.config = config;
	}

	async execute(prompt: string, files?: FileAttachment[]): Promise<void> {
		const { logger, systemPrompt, sessionId } = this.config;

		this.abortController = new AbortController();
		let queryError: string | undefined;

		try {
			logger.info("Starting Codex Agent");

			if (sessionId) {
				logger.info(`Resuming session: ${sessionId}`);
			}

			if (files && files.length > 0) {
				logger.info(`Processing ${files.length} file attachment(s)`);
			}

			// Dynamic import to avoid CJS/ESM compatibility issues
			// @openai/codex-sdk is ESM-only and can't be statically imported in CJS
			const { Codex } = await import("@openai/codex-sdk");
			const mcpTransport = this.getMcpConfig();

			const codex = new Codex({
				codexPathOverride: this.getExecutablePath(),
				apiKey: this.config.apiKey,
				config: {
					...(systemPrompt
						? { developer_instructions: systemPrompt }
						: undefined),
					mcp_servers: {
						pencil: {
							...(mcpTransport ?? undefined),
							disabled_tools: this.config.disallowedTools ?? [],
						},
					},
				},
			});

			const threadOptions: ThreadOptions = {
				model: this.config.model,
				skipGitRepoCheck: true,
				workingDirectory: this.config.cwd,
				webSearchEnabled: true,
				sandboxMode: this.config.dangerouslySkipPermissions
					? "danger-full-access"
					: "workspace-write",
				modelReasoningEffort: "low",
				...(this.config.dangerouslySkipPermissions
					? { approvalPolicy: "never" as const }
					: undefined),
			};

			this.thread = sessionId
				? codex.resumeThread(sessionId, threadOptions)
				: codex.startThread(threadOptions);

			const promptContent = await this.buildPromptWithFiles(prompt, files);
			const { events } = await this.thread.runStreamed(promptContent, {
				signal: this.abortController.signal,
			});

			let finalResponse: string = "";
			for await (const event of events) {
				logger.info(event);

				switch (event.type) {
					case "thread.started":
						this.emit("chat-session", {
							sessionId: event.thread_id,
						});
						break;
					case "turn.failed":
						logger.error("Codex agent turn failed:", queryError);
						break;
					case "error":
						queryError = event.message;
						logger.error("Codex agent error:", queryError);
						break;
					case "turn.completed":
						logger.info("Codex agent usage:", event.usage);
						break;
					case "item.started": {
						const item = event.item;
						switch (item.type) {
							case "mcp_tool_call":
								this.emit("chat-tool-use", {
									toolName: item.tool,
									toolInput: item.arguments,
									toolUseId: item.id,
								});
								break;
							case "agent_message":
								this.emit("chat-agent-message", {
									content: [
										{
											type: "text",
											text: item.text,
										},
									],
								});
								break;
							case "todo_list":
								this.emit("chat-tool-use", {
									toolUseId: item.id,
									toolInput: {
										todos: item.items.map((i, ix: number) => {
											const text =
												typeof i === "object" && i !== null && "text" in i
													? (i as { text?: unknown }).text
													: undefined;
											const completed =
												typeof i === "object" && i !== null && "completed" in i
													? (i as { completed?: unknown }).completed
													: undefined;
											return {
												id: `${item.id}-${ix}`,
												content: typeof text === "string" ? text : "",
												status: completed === true ? "completed" : "pending",
											};
										}),
									},
									toolName: "todo_write",
								});
								break;
							case "command_execution":
								this.emit("chat-tool-use", {
									toolUseId: item.id,
									toolInput: {
										command: item.command,
									},
									toolName: "Bash",
								});
								break;
							case "web_search":
								this.emit("chat-tool-use", {
									toolUseId: item.id,
									toolInput:
										typeof item === "object" &&
										item !== null &&
										"action" in item
											? (item as { action?: unknown }).action
											: undefined,
									toolName: "WebSearch",
								});
								break;
							default:
								break;
						}
						break;
					}
					case "item.updated": {
						const item = event.item;
						if (item.type === "todo_list") {
							this.emit("chat-tool-use", {
								toolUseId: item.id,
								toolInput: {
									todos: item.items.map((i, ix: number) => {
										const text =
											typeof i === "object" && i !== null && "text" in i
												? (i as { text?: unknown }).text
												: undefined;
										const completed =
											typeof i === "object" && i !== null && "completed" in i
												? (i as { completed?: unknown }).completed
												: undefined;
										return {
											id: `${item.id}-${ix}`,
											content: typeof text === "string" ? text : "",
											status: completed === true ? "completed" : "pending",
										};
									}),
								},
								toolName: "todo_write",
							});
						}
						break;
					}
					case "item.completed": {
						const item = event.item;

						if (item.type === "agent_message") {
							finalResponse = item.text;
						}

						switch (item.type) {
							case "agent_message":
								this.emit("chat-agent-message", {
									content: [
										{
											type: "text",
											text: item.text,
										},
									],
								});
								break;
							case "reasoning":
								this.emit("chat-agent-message", {
									content: [
										{
											type: "text",
											text: item.text,
										},
									],
								});
								break;
							case "mcp_tool_call":
								this.emit("chat-tool-result", {
									toolUseId: item.id,
									toolOutput:
										item.status === "failed"
											? item.error?.message
											: item.result?.content,
									isError: item.status === "failed",
								});
								break;
							case "todo_list":
								this.emit("chat-tool-use", {
									toolUseId: item.id,
									toolInput: {
										todos: item.items.map((i, ix: number) => {
											const text =
												typeof i === "object" && i !== null && "text" in i
													? (i as { text?: unknown }).text
													: undefined;
											const completed =
												typeof i === "object" && i !== null && "completed" in i
													? (i as { completed?: unknown }).completed
													: undefined;
											return {
												id: `${item.id}-${ix}`,
												content: typeof text === "string" ? text : "",
												status: completed === true ? "completed" : "pending",
											};
										}),
									},
									toolName: "todo_write",
								});
								break;
							case "command_execution":
								this.emit("chat-tool-result", {
									toolUseId: item.id,
									toolOutput: item.aggregated_output,
									isError: item.status === "failed",
								});
								break;
							case "file_change":
								this.emit("chat-tool-use", {
									toolUseId: item.id,
									toolInput: {
										changes: item.changes,
										status: item.status,
									},
									toolName: "Update",
								});
								this.emit("chat-tool-result", {
									toolUseId: item.id,
									toolOutput: item.status,
									isError: item.status === "failed",
								});
								break;
							case "web_search":
								this.emit("chat-tool-result", {
									toolUseId: item.id,
									toolOutput:
										typeof item === "object" &&
										item !== null &&
										"action" in item
											? (item as { action?: unknown }).action
											: undefined,
									isError: false,
								});
								break;

							default:
								break;
						}
						break;
					}

					default:
						break;
				}
			}

			this.emit("completed", { response: finalResponse, error: queryError });
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error("Error executing Codex Agent:", errorMessage);

			this.emit("failed", { message: errorMessage, error: queryError });
		} finally {
			this.thread = undefined;
			this.abortController = undefined;
		}
	}

	async stop(): Promise<void> {
		if (this.thread) {
			this.config.logger.info("Stopping Codex Agent");

			try {
				this.abortController?.abort();
				this.config.logger.info("Agent stopped successfully");
			} catch (error) {
				this.config.logger.error("Error stopping agent:", error);
			}

			this.emit("stopped");

			this.thread = undefined;
			this.abortController = undefined;
		}
	}

	isRunning(): boolean {
		return this.thread !== undefined;
	}

	getConfig(): Readonly<AgentConfig> {
		return Object.freeze({ ...this.config });
	}

	destroy(): void {
		const { logger } = this.config;
		logger.debug("destroy()");
		this.removeAllListeners();
	}

	private getMcpConfig():
		| {
				command: string;
				args: string[];
				env: Record<string, string>;
		  }
		| undefined {
		if (!this.config.mcpServers) {
			return undefined;
		}

		for (const server of this.config.mcpServers) {
			if (server.transport === "stdio") {
				return {
					command: server.command,
					args: server.args,
					env: server.env,
				};
			}
		}

		return undefined;
	}

	private async buildPromptWithFiles(
		prompt: string,
		files?: FileAttachment[],
	): Promise<string | UserInput[]> {
		if (!files || files.length === 0) {
			return prompt;
		}

		const inputs: UserInput[] = [
			{
				type: "text",
				text: prompt,
			},
		];

		for (const file of files) {
			if (file.type === "text") {
				inputs.push({
					type: "text",
					text: file.content,
				});
			} else if (file.type === "image" && file.path) {
				inputs.push({
					type: "local_image",
					path: file.path,
				});
			}
		}

		return inputs;
	}

	private getExecutablePath(): string | undefined {
		if (!this.config.packagePath) {
			return undefined;
		}

		const arch = os.arch() === "arm64" ? "aarch64" : "x86_64";
		const codexBinaryName =
			process.platform === "win32" ? "codex.exe" : "codex";
		const plat =
			os.platform() === "darwin"
				? "apple-darwin"
				: os.platform() === "win32"
					? "pc-windows-msvc"
					: "unknown-linux-musl";
		return path.join(
			this.config.packagePath,
			"vendor",
			`${arch}-${plat}`,
			"codex",
			codexBinaryName,
		);
	}
}
