import * as path from "node:path";
import {
  listSessions,
  type Options,
  type PermissionResult,
  type Query,
  query,
  type SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { EventEmitter } from "eventemitter3";
import { jsonrepair } from "jsonrepair";
import type { AgentConfig } from "../config.js";
import type {
  FileAttachment,
  PencilAgent,
  PencilAgentEvents,
} from "../types.js";

// Message event from the agent during execution
export interface ClaudeAgentMessage {
  type: "assistant" | "result" | "tool_use";
  content?: unknown;
  status?: string;
  message?: string;
}

export class ClaudeAgent
  extends EventEmitter<PencilAgentEvents>
  implements PencilAgent {
  private config: AgentConfig;
  private agentQuery: Query | undefined = undefined;
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
      logger.info("Starting Claude Agent");

      if (sessionId) {
        logger.info(`Resuming session: ${sessionId}`);
      }

      if (files && files.length > 0) {
        logger.info(`Processing ${files.length} file attachment(s)`);
      }

      const mcpServers = this.getMcpConfig();

      const disallowedTools: string[] = [];
      if (this.config.disallowedTools) {
        for (const toolName of this.config.disallowedTools) {
          disallowedTools.push(`mcp__pencil__${toolName}`);
        }
      }

      const options: Options = {
        model:
          this.config.model === "custom-model" ? undefined : this.config.model,
        pathToClaudeCodeExecutable: this.getExecutablePath(),
        // @ts-expect-error
        executable: this.config.execPath,
        env: this.config.env,
        cwd: this.config.cwd,
        stderr: (data: string) => {
          logger.debug("Agent stderr:", data);
        },
        settingSources: ["local", "project", "user"],
        mcpServers: mcpServers,
        maxTurns: this.config.maxTurns || 500,
        allowedTools: ["mcp__pencil", "WebSearch", "WebFetch"],
        disallowedTools,
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          append: systemPrompt,
        },
        abortController: this.abortController,
        ...(this.config.dangerouslySkipPermissions
          ? {
            allowDangerouslySkipPermissions: true,
            permissionMode: "bypassPermissions" as const,
          }
          : undefined),
        includePartialMessages: this.config.includePartialMessages,
        canUseTool: async (
          toolName,
          input,
          options,
        ): Promise<PermissionResult> => {
          logger.info("Claude permission request", toolName, input, options);

          // Only allow file access inside the current working directory.
          if (
            this.config.cwd &&
            input.file_path &&
            isPathInside(input.file_path as string, this.config.cwd)
          ) {
            return {
              behavior: "allow",
              updatedInput: input,
            };
          }

          if (
            this.config.cwd &&
            options.blockedPath &&
            isPathInside(options.blockedPath, this.config.cwd)
          ) {
            return {
              behavior: "allow",
              updatedInput: input,
            };
          }

          const result = await new Promise<"allow" | "always-allow" | "deny">(
            (resolve) => {
              this.emit("permission-request", {
                toolName,
                input: input as Record<string, unknown>,
                resolve,
              });
            },
          );

          if (result === "allow") {
            return {
              behavior: "allow",
              updatedInput: input,
            };
          }

          if (result === "always-allow") {
            return {
              behavior: "allow",
              updatedInput: input,
              updatedPermissions: options.suggestions,
            };
          }

          return {
            behavior: "deny",
            message: "User denied permission",
          };
        },
      };

      if (sessionId) {
        // Validate session id with current Claude state to prevent resuming
        // sessions that does not exist.
        const sessionFound = (await listSessions()).find(
          (s) => s.sessionId === sessionId,
        );

        if (sessionFound) {
          options.resume = sessionId;
          // If we are resuming an already existing session, always use the
          // cwd of that session, otherwise prompting fails.
          options.cwd = sessionFound.cwd;
        } else {
          logger.warn(`Cannot resume, session id does not exist: ${sessionId}`);
        }
      }

      const promptContent = await this.buildPromptWithFiles(
        prompt,
        sessionId,
        files,
      );
      // const optionsForLog = {
      //   ...options,
      //   env: options.env
      //     ? Object.fromEntries(
      //       Object.keys(options.env).map((key) => [key, "[REDACTED]"]),
      //     )
      //     : options.env,
      //   stderr: undefined,
      //   abortController: undefined,
      //   canUseTool: undefined,
      // };
      // logger.debug("Claude query options:", optionsForLog);
      this.agentQuery = query({
        prompt: promptContent,
        options: {
          ...options,
          model: 'claude-3-5-sonnet-20241022',
          env: {
            ...options.env,
            ANTHROPIC_BASE_URL: 'http://127.0.0.1:15721', // 修改这里！
            ANTHROPIC_API_KEY: 'sk-or',
            ANTHROPIC_BETAS: '' // 建议置空，避开 400 错误
          }
        },
      });

      const batchDesignCalls = new Map<
        number,
        { filePath?: string; operations: string[]; acc: string; id: string }
      >();

      const spawnAgentCalls = new Map<
        number,
        {
          filePath?: string;
          agentsConfig: object[];
          acc: string;
          id: string;
          index: number;
        }
      >();

      const thinkingMessages = new Map<number, { acc: string }>();

      let finalResponse: string = "";

      for await (const message of this.agentQuery) {
        // Forward all messages to onMessage callback except streaming
        if (message.type !== "stream_event") {
          logger.debug(`onMessage received: type=${message.type}`);

          // Handle session init message
          if (
            message.type === "system" &&
            message.subtype === "init" &&
            message.session_id
          ) {
            this.emit("chat-session", {
              sessionId: message.session_id,
            });
          }

          // Handle user messages that contain tool_result content blocks
          if (message.type === "user" && message.message?.content) {
            if (typeof message.message.content !== "string") {
              for (const content of message.message.content) {
                if (content.type === "tool_result" && content.tool_use_id) {
                  logger.debug(`Tool result for ${content.tool_use_id}`);
                  this.emit("chat-tool-result", {
                    toolUseId: content.tool_use_id,
                    toolOutput: content.content,
                    isError: content.is_error || false,
                  });
                }
              }
            }
          }

          // Handle assistant text streaming and tool use
          if (message.type === "assistant" && message.message?.content) {
            logger.debug(
              `Assistant message with ${message.message.content.length} content items`,
            );

            for (const content of message.message.content) {
              if (content.type === "tool_use" && content.name) {
                this.emit("chat-tool-use", {
                  toolName: content.name,
                  toolInput: content.input,
                  toolUseId: content.id,
                });
              }
            }

            this.emit("chat-agent-message", {
              content: message.message.content,
            });
          }
        }

        if (message.type === "system" && message.subtype === "init") {
          const session = (
            "session_id" in message
              ? (message as { session_id?: unknown }).session_id
              : undefined
          ) as unknown;
          logger.debug("Session initialized:", session);
        }

        if (message.type === "stream_event") {
          if (
            message.event.type === "content_block_start" &&
            message.event.content_block.type === "tool_use" &&
            message.event.content_block.name === "mcp__pencil__batch_design"
          ) {
            batchDesignCalls.set(message.event.index, {
              operations: [],
              acc: "",
              id: message.event.content_block.id,
            });

            this.emit("tool-use-start", {
              name: message.event.content_block.name,
              id: message.event.content_block.id,
            });
          }

          if (
            message.event.type === "content_block_start" &&
            message.event.content_block.type === "tool_use" &&
            message.event.content_block.name === "mcp__pencil__spawn_agents"
          ) {
            spawnAgentCalls.set(message.event.index, {
              agentsConfig: [],
              acc: "",
              id: message.event.content_block.id,
              index: 0,
            });

            this.emit("tool-use-start", {
              name: message.event.content_block.name,
              id: message.event.content_block.id,
            });
          }

          if (
            message.event.type === "content_block_start" &&
            message.event.content_block.type === "text"
          ) {
            thinkingMessages.set(message.event.index, {
              acc: message.event.content_block.text,
            });
          }

          if (message.event.type === "content_block_stop") {
            const call = spawnAgentCalls.get(message.event.index);

            if (!call) {
              continue;
            }
            if (!call.filePath) {
              continue;
            }

            const newConfigs = call.agentsConfig.slice(
              call.index,
              call.agentsConfig.length,
            );

            this.emit("spawn-agents", {
              filePath: call.filePath,
              agentsConfig: newConfigs,
              id: call.id,
              partial: true,
            });

            spawnAgentCalls.delete(message.event.index);
          }

          if (message.event.type === "content_block_stop") {
            batchDesignCalls.delete(message.event.index);
            thinkingMessages.delete(message.event.index);
          }

          if (
            message.event.type === "content_block_delta" &&
            message.event.delta.type === "input_json_delta" &&
            batchDesignCalls.has(message.event.index)
          ) {
            const call = batchDesignCalls.get(message.event.index);

            if (!call) {
              continue;
            }

            call.acc += message.event.delta.partial_json;

            const parsed = completePartialBatchDesign(call.acc);

            if (
              parsed?.operations &&
              parsed.operations.length > call.operations.length
            ) {
              const newOperations = [];
              for (
                let i = call.operations.length;
                i < parsed.operations.length;
                ++i
              ) {
                newOperations.push(parsed.operations[i]);
              }

              call.filePath = parsed.filePath;
              call.operations = parsed.operations;

              const newEvent = {
                filePath: parsed.filePath,
                operations: newOperations.join("\n"),
                id: call.id,
                partial: true,
              };

              this.emit("batch-design", newEvent);
            }
          }

          if (
            message.event.type === "content_block_delta" &&
            message.event.delta.type === "input_json_delta" &&
            spawnAgentCalls.has(message.event.index)
          ) {
            const call = spawnAgentCalls.get(message.event.index);

            if (!call) {
              continue;
            }

            call.acc += message.event.delta.partial_json;

            const parsed = completePartialSpawnAgents(call.acc);

            if (parsed?.config) {
              const newConfigs = [];
              for (
                let i = call.agentsConfig.length;
                i < parsed.config.length;
                ++i
              ) {
                newConfigs.push(parsed.config[i]);
              }

              call.filePath = parsed.filePath;
              call.agentsConfig = parsed?.config;

              if (call.agentsConfig.length > call.index + 1) {
                const newConfigs = call.agentsConfig.slice(
                  call.index,
                  call.agentsConfig.length - 1,
                );

                call.index += newConfigs.length;

                this.emit("spawn-agents", {
                  filePath: parsed.filePath,
                  agentsConfig: newConfigs,
                  id: call.id,
                  partial: true,
                });
              }
            }
          }

          if (
            message.event.type === "content_block_delta" &&
            message.event.delta.type === "text_delta"
          ) {
            const thinkingMessage = thinkingMessages.get(message.event.index);

            if (!thinkingMessage) {
              continue;
            }

            thinkingMessage.acc += message.event.delta.text;

            const agentThinking = Array.from(thinkingMessages.values())
              .map((m) => m.acc)
              .join("\n\n");

            this.emit("thinking-update", { text: agentThinking });
          }
        }

        if (
          message.type === "assistant" &&
          message.message.type === "message"
        ) {
          logger.debug(
            "Agent message:",
            JSON.stringify(message.message.content, null, 2),
          );

          queryError = message.error;

          for (const content of message.message.content) {
            if (content.type === "text") {
              finalResponse = content.text;
            }
          }
        }
      }

      this.emit("completed", { response: finalResponse, error: queryError });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Error executing Claude Agent:", errorMessage);

      this.emit("failed", { message: errorMessage, error: queryError });
    } finally {
      this.agentQuery = undefined;
      this.abortController = undefined;
    }
  }

  async stop(): Promise<void> {
    if (this.agentQuery) {
      this.config.logger.info("Stopping Claude Agent");

      try {
        this.abortController?.abort();
        this.config.logger.info("Agent stopped successfully");
      } catch (error) {
        this.config.logger.error("Error stopping agent:", error);
      }

      this.emit("stopped");

      this.agentQuery = undefined;
      this.abortController = undefined;
    }
  }

  isRunning(): boolean {
    return this.agentQuery !== undefined;
  }

  getConfig(): Readonly<AgentConfig> {
    return Object.freeze({ ...this.config });
  }

  destroy(): void {
    const { logger } = this.config;
    logger.debug("destroy()");
    this.removeAllListeners();
  }

  private getMcpConfig(): Record<
    string,
    {
      command: string;
      args: string[];
      env: Record<string, string>;
    }
  > {
    const mcpServers: Record<
      string,
      {
        command: string;
        args: string[];
        env: Record<string, string>;
      }
    > = {};

    if (!this.config.mcpServers) {
      return mcpServers;
    }

    for (const server of this.config.mcpServers) {
      if (server.transport === "stdio") {
        mcpServers[server.name] = {
          command: server.command,
          args: server.args,
          env: server.env,
        };
      }
    }

    return mcpServers;
  }

  private async buildPromptWithFiles(
    prompt: string,
    sessionId?: string,
    files?: FileAttachment[],
  ): Promise<string | AsyncIterable<SDKUserMessage>> {
    if (!files || files.length === 0) {
      return prompt;
    }

    const params: Array<
      | {
        type: "image";
        source: Extract<FileAttachment, { type: "image" }>["source"];
      }
      | { type: "text"; text: string }
    > = [];
    for (const f of files) {
      if (f.type === "image") {
        params.push({ type: "image", source: f.source });
      } else if (f.type === "text") {
        params.push({ type: "text", text: f.content });
      }
    }

    const userMessage: SDKUserMessage = {
      type: "user",
      message: {
        role: "user",
        content: [...params, { text: prompt, type: "text" }],
      },
      session_id: sessionId ?? "",
      parent_tool_use_id: null,
    };

    return (async function* () {
      yield userMessage;
    })();
  }

  private getExecutablePath(): string | undefined {
    return this.config.packagePath
      ? path.join(this.config.packagePath, "cli.js")
      : undefined;
  }
}

function completePartialBatchDesign(
  str: string,
): { filePath: string; operations?: string[] } | undefined {
  try {
    let res = str.slice(0);
    res = jsonrepair(res);
    const parsed = JSON.parse(res);
    if (parsed.operations) {
      parsed.operations = parsed.operations
        .split("\n")
        .filter((op: string) => op.endsWith(")"));
    }

    return parsed;
  } catch (_err: unknown) {
    return undefined;
  }
}

function completePartialSpawnAgents(
  str: string,
): { filePath: string; config?: object[] } | undefined {
  try {
    let res = str.slice(0);
    res = jsonrepair(res);
    const parsed = JSON.parse(res);

    // Validate parsed input to avoid returning data with incorrect type.
    if (parsed.config && !Array.isArray(parsed.config)) {
      return undefined;
    }

    return parsed;
  } catch (_err: unknown) {
    return undefined;
  }
}

function isPathInside(childPath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}
