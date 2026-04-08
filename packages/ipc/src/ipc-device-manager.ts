import * as fs from "node:fs";
import * as path from "node:path";
import type { AgentConfig, FileAttachment, PencilAgent } from "@ha/agent";
import { createAgent } from "@ha/agent";
import { getMcpConfiguration } from "@ha/mcp";
import {
  type AgentType,
  getAgentTypeFromModelID,
  type ILogger,
  type IPCHost,
  type IPCServer,
} from "@ha/shared";
import type { WebSocketServerManager } from "@ha/ws-server";
import schema from "../../schema/generated-schema.md?raw";
import type { ResourceDevice } from "./resource-device";
import { WebSocketRequestRouter } from "./websocket-request-router.js";
import { fileURLToPath, pathToFileURL } from "node:url";

const unique = (arr: string[]): string[] => [...new Set(arr)];

const readOptionalFile = (filePath: string): string | undefined => {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return undefined;
  }
};

const getRules = (): { generalRules: string; designRules: string } => {
  const rulesRoot = process.env.PENCIL_EDITOR_ROOT
    ? path.resolve(process.env.PENCIL_EDITOR_ROOT)
    : undefined;

  const generalFromFile = rulesRoot
    ? readOptionalFile(
        path.join(rulesRoot, "src/tool-handlers/rules/general.md"),
      )
    : undefined;
  const designFromFile = rulesRoot
    ? readOptionalFile(path.join(rulesRoot, "src/tool-handlers/rules/design.md"))
    : undefined;

  return {
    generalRules:
      process.env.PENCIL_GENERAL_RULES ?? generalFromFile ?? "",
    designRules: process.env.PENCIL_DESIGN_RULES ?? designFromFile ?? "",
  };
};

interface PendingDocument {
  resolve: () => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class IPCDeviceManager {
  private ipcMap: Map<string, IPCHost> = new Map();
  private deviceMap: Map<string, ResourceDevice> = new Map();
  private initializedDocuments: Set<string> = new Set();
  private lastFocusedResource: string | undefined;
  private workspaces: string[] | undefined;
  private requestRouter: WebSocketRequestRouter | undefined;
  private pendingDocuments: Map<string, PendingDocument> = new Map();
  private pencilAgents = new Map<string, PencilAgent>();
  private deviceConversations = new Map<string, string[]>();

  constructor(
    private readonly wsServerManager: WebSocketServerManager,
    private readonly logger: ILogger,
    private readonly appFolderPath: string,
    private readonly mcpAppName: string,
    private readonly onOpenDocument?: (filePath: string) => Promise<void>,
    private readonly openDocument?: (filePath: string) => Promise<void>,
  ) {}

  public setWorkspaces(dirs: string[]): void {
    this.workspaces = dirs;
  }

  public waitForDocumentReady(
    filePath: string,
    timeoutMs = 15000,
  ): Promise<void> {
    let resolvedPath: string | undefined;

    if (path.isAbsolute(filePath)) {
      try {
        if (fs.statSync(filePath).isFile()) {
          resolvedPath = filePath;
        }
      } catch {
        // File doesn't exist
      }
    } else {
      for (const workspaceDir of this.workspaces || []) {
        const candidatePath = path.join(workspaceDir, filePath);
        try {
          if (fs.statSync(candidatePath).isFile()) {
            resolvedPath = candidatePath;
            break;
          }
        } catch {
          continue;
        }
      }
    }

    // File doesn't exist - a new document was opened, no need to wait
    if (!resolvedPath) {
      return Promise.resolve();
    }

    if (this.initializedDocuments.has(resolvedPath)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingDocuments.delete(resolvedPath);
        reject(new Error(`Timeout waiting for document: ${resolvedPath}`));
      }, timeoutMs);

      this.pendingDocuments.set(resolvedPath, { resolve, reject, timeout });
    });
  }

  public addResource(ipc: IPCHost, device: ResourceDevice) {
    this.logger.info("addResource:", device.getResourcePath());

    const resourcePath = device.getResourcePath();
    this.ipcMap.set(resourcePath, ipc);
    this.deviceMap.set(resourcePath, device);

    ipc.handle<any, { email: string; token: string } | undefined>(
      "get-session",
      async () => {
        this.logger.info("[IPC] get-session");

        return device.getSession();
      },
    );

    ipc.on<{ email: string; token: string }>(
      "set-session",
      ({ email, token }) => {
        this.logger.info("[IPC] set-session", email);

        device.setSession(email, token);
      },
    );

    ipc.handle<any, { timestamp?: number }>("get-last-online-at", async () => {
      return { timestamp: device.getLastOnlineAt() };
    });

    ipc.on<{ timestamp: number }>("set-last-online-at", ({ timestamp }) => {
      device.setLastOnlineAt(timestamp);
    });

    // Provide hashed machine id for session identification
    ipc.handle<any, { deviceId?: string }>("get-device-id", async () => {
      this.logger.info("[IPC] get-device-id");

      return {
        deviceId: device.getDeviceId(),
      };
    });

    ipc.handle<string, ArrayBufferLike>(
      "read-file",
      async (fileURI: string): Promise<ArrayBufferLike> => {
        this.logger.info("[IPC] read-file", fileURI);

        const filePath = fileURI.startsWith("file:") ? fileURLToPath(fileURI) : fileURI;
        const data = await device.readFile(filePath);

        if (data.length === data.buffer.byteLength) {
          return data.buffer;
        } else {
          return data.buffer.slice(
            data.byteOffset,
            data.byteOffset + data.byteLength,
          );
        }
      },
    );

    ipc.handle<{ image: string }, { relativePath: string }>(
      "save-generated-image",
      async ({ image }) => {
        this.logger.info("[IPC] save-generated-image");

        const resourceDir = await device.getResourceFolderPath();
        const imagesDir = path.join(resourceDir, "images");
        await device.ensureDir(imagesDir);

        // Save the image to disk
        const buffer = Buffer.from(image, "base64");
        const filename = `generated-${Date.now()}.png`;
        const imageFilePath = path.join(imagesDir, filename);

        await device.writeFile(imageFilePath, new Uint8Array(buffer));

        const relativePath = `./images/${filename}`;

        return { relativePath };
      },
    );

    ipc.handle<
      { base64Data: string; ext: string; name?: string },
      { path: string }
    >("save-temp-file", async ({ base64Data, ext, name }) => {
      const filePath = await device.saveTempFile(base64Data, ext, name);
      return { path: filePath };
    });

    ipc.on<{ paths: string[] }>("cleanup-temp-files", async ({ paths }) => {
      await device.cleanupTempFiles(paths);
    });

    ipc.on("initialized", () => {
      this.logger.info("[IPC] initialized:", resourcePath);
      this.initializedDocuments.add(resourcePath);

      ipc.notify<{
        content: string;
        fileURI: string;
        isDirty: boolean;
        zoomToFit?: boolean;
      }>("file-update", {
        content: device.getResourceContents(),
        fileURI: device.getResourcePath().startsWith("pencil:") ? device.getResourcePath() : pathToFileURL(device.getResourcePath()).toString(),
        isDirty: device.getIsDirty(),
        zoomToFit: true,
      });

      ipc.notify<{ theme: "dark" | "light" }>("color-theme-changed", {
        theme: device.getActiveThemeKind(),
      });

      const pending = this.pendingDocuments.get(resourcePath);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve();
        this.pendingDocuments.delete(resourcePath);
      }
    });

    ipc.on<{ content: string }>("file-changed", () => {
      this.logger.info("[IPC] file-changed");

      device.fileChanged();
    });

    ipc.handle<
      { fileName: string; fileContents: ArrayBufferLike },
      { filePath: string }
    >("import-file", async ({ fileName, fileContents }) => {
      this.logger.info("[IPC] import-file", fileName);

      if (device.isTemporary() && path.isAbsolute(fileName)) {
        return { filePath: fileName };
      }

      return device.importFileByName(fileName, fileContents);
    });

    ipc.handle<
      { fileName: string; fileContents: ArrayBufferLike }[],
      { filePath: string }[]
    >("import-files", async (files) => {
      this.logger.info(
        "[IPC] import-files",
        files.map((f) => f.fileName).join(", "),
      );

      return device.importFiles(files);
    });

    ipc.handle<
      { uri: string },
      { filePath: string; fileContents: ArrayBufferLike }
    >("import-uri", async ({ uri }) => {
      this.logger.info("[IPC] import-uri", uri);

      return device.importFileByUri(uri);
    });

    ipc.on<{
      prompt: string;
      modelID: string;
      conversationId: string;
      sessionId?: string;
      selectedIDs?: string[];
      files?: FileAttachment[];
      subagent?: boolean;
      agentMultiplier?: number;
      userMessageExtension?: string;
      dangerouslySkipPermissions?: boolean;
    }>(
      "send-prompt",
      async ({
        prompt,
        modelID,
        conversationId,
        sessionId,
        files,
        subagent,
        agentMultiplier,
        userMessageExtension,
        dangerouslySkipPermissions,
      }) => {
        this.logger.info(
          "[IPC] send-prompt",
          prompt,
          modelID,
          conversationId,
          sessionId,
          files ? `(${files.length} files)` : "(no files)",
        );

        const agentType = getAgentTypeFromModelID(modelID);

        const agent = await this.invokeAgent({
          prompt,
          device,
          modelID,
          agentType,
          conversationId,
          sessionId,
          files,
          subagent,
          agentMultiplier,
          userMessageExtension,
          dangerouslySkipPermissions,
        });

        this.pencilAgents.set(conversationId, agent);

        this.deviceConversations.set(resourcePath, [
          ...(this.deviceConversations.get(resourcePath) || []),
          conversationId,
        ]);
      },
    );

    ipc.handle(
      "agent-stop",
      async ({ conversationId }: { conversationId: string }) => {
        this.logger.info("[IPC] agent-stop", { conversationId });

        const agent = this.pencilAgents.get(conversationId);
        if (agent) {
          await agent.stop();
        }
      },
    );

    ipc.on("open-document", async (type: string) => {
      this.logger.info("[IPC] open-document", type);

      return device.openDocument(type);
    });

    ipc.on<{
      prompt: string;
      model: string | undefined;
      files?: FileAttachment[];
    }>("submit-prompt", async ({ prompt, model, files }) => {
      this.logger.info("[IPC] submit-prompt", prompt, model);

      await device.submitPrompt(prompt, model, undefined, files);
    });

    ipc.on("toggle-design-mode", () => {
      this.logger.info("[IPC] toggle-design-mode");

      device.toggleDesignMode();
    });

    ipc.on<{ visible: boolean }>("set-left-sidebar-visible", ({ visible }) => {
      this.logger.info("[IPC] set-left-sidebar-visible");

      device.setLeftSidebarVisible(visible);
    });

    ipc.on("sign-out", () => {
      device.signOut();
      ipc.notify("did-sign-out");
    });

    ipc.on<{ url: string }>("open-external-url", ({ url }) => {
      device.openExternalUrl(url);
    });

    // Handle question responses from the UI
    ipc.on<{
      conversationId: string;
      sessionId?: string;
      toolUseId: string;
      output: {
        questions: Array<{
          question: string;
          header: string;
          options: Array<{ label: string; description: string }>;
          multiSelect: boolean;
        }>;
        answers: Record<string, string>;
      };
    }>("chat-question-response", ({ conversationId, toolUseId, output }) => {
      this.logger.info(
        `[IPC] chat-question-response: toolUseId=${toolUseId} for conversation=${conversationId}`,
      );
      this.logger.info(
        `[IPC] Question answers: ${JSON.stringify(output.answers)}`,
      );

      // Format the user's answers as a readable response
      const answerEntries = Object.entries(output.answers);
      let answerText: string;

      if (answerEntries.length === 1) {
        // Single answer - just show the answer
        answerText = answerEntries[0][1];
      } else {
        // Multiple answers - show Q&A format
        answerText = answerEntries
          .map(([question, answer]) => `${question}: ${answer}`)
          .join("\n");
      }

      // Send the answer back to the UI
      if (answerText) {
        ipc.notify<{
          conversationId: string;
          userResponse: string;
          toolUseId: string;
        }>("chat-question-answered", {
          conversationId,
          userResponse: answerText,
          toolUseId,
        });
      }
    });

    ipc.on<{ filePath: string }>(
      "load-file",
      ({ filePath }: { filePath: string }) => {
        // TODO(zaza): get rid of this URL hack
        if (filePath.startsWith("file:")) {
          filePath = fileURLToPath(filePath);
        }
        device.loadFile(filePath);
      },
    );

    ipc.handle<void, string[]>("find-libraries", async () => (await device.findLibraries()).map(path => pathToFileURL(path).toString()));

    ipc.on("turn-into-library", async () => {
      this.logger.info("[IPC] turn-into-library");
      await device.turnIntoLibrary();
    });

    ipc.handle<{ multiple: boolean }, string[] | undefined>(
      "browse-libraries",
      async ({ multiple }) => (await device.browseLibraries(multiple))?.map(path => pathToFileURL(path).toString()),
    );
  }

  public async stopAllAgents(): Promise<void> {
    this.logger.info("stopAllAgents()");

    for (const [, agent] of this.pencilAgents) {
      await agent.stop();
    }
  }

  public async invokeAgent(obj: {
    prompt: string;
    device: ResourceDevice;
    agentType: AgentType;
    conversationId: string;
    modelID?: string;
    sessionId?: string;
    files?: FileAttachment[];
    disallowedTools?: string[];
    subagent?: boolean;
    agentMultiplier?: number;
    userMessageExtension?: string;
    dangerouslySkipPermissions?: boolean;
  }): Promise<PencilAgent> {
    const {
      prompt,
      device,
      modelID,
      agentType,
      conversationId,
      sessionId,
      files,
      disallowedTools,
      subagent,
      agentMultiplier,
      userMessageExtension,
      dangerouslySkipPermissions,
    } = obj;

    const ipc = this.ipcMap.get(device.getResourcePath());
    if (!ipc) {
      throw new Error(
        `IPC not found for resource: ${device.getResourcePath()}`,
      );
    }

    this.logger.info(
      `[IPC] invokeAgent with conversationId: ${conversationId}, sessionId: ${sessionId}`,
    );

    const enableSpawnAgents =
      agentMultiplier !== undefined && agentMultiplier > 1;
    const disallowedToolsBySubagent = subagent
      ? ["get_editor_state", "set_variables", "spawn_agents"]
      : [];

    const { prompt: finalPrompt, files: promptFiles } = await getUserPrompt(
      ipc,
      prompt,
      files,
      agentMultiplier,
      userMessageExtension,
    );

    const finalDisallowedTools = [
      ...(disallowedTools || []),
      ...disallowedToolsBySubagent,
      ...(!enableSpawnAgents ? ["spawn_agents"] : []),
      // https://code.claude.com/docs/en/tools-reference
      ...(agentType === "claude" ? ["Skill", "Agent"] : []),
      "open_document",
    ];

    const pencilMcpServer = getMcpConfiguration({
      folderPath: this.appFolderPath,
      appName: this.mcpAppName,
      conversationId,
      enableSpawnAgents,
    });

    const agentConfig: AgentConfig = {
      logger: this.logger,
      filePath: device.getResourcePath(),
      model: modelID,
      sessionId: sessionId, // Pass session ID for resume
      mcpServers: [pencilMcpServer],
      packagePath: device.getAgentPackagePath(agentType),
      execPath: device.execPath(),
      env: device.getAgentEnv(),
      includePartialMessages: device.agentIncludePartialMessages(),
      systemPrompt: await getAgentSystemPrompt(ipc),
      apiKey: device.getAgentApiKey(agentType),
      cwd: await device.getWorkspaceFolderPath(),
      disallowedTools: unique(finalDisallowedTools),
      dangerouslySkipPermissions,
    };

    const agent = createAgent(agentType, agentConfig);

    agent.on("chat-session", (event) => {
      ipc.notify("chat-session", { conversationId, ...event });
    });

    agent.on("chat-agent-message", (event) => {
      ipc.notify("chat-agent-message", { conversationId, ...event });
    });

    agent.on("chat-tool-use", (event) => {
      ipc.notify("chat-tool-use", { conversationId, ...event });
    });

    agent.on("chat-tool-result", (event) => {
      ipc.notify("chat-tool-result", { conversationId, ...event });
    });

    agent.on("tool-use-start", (toolUse) => {
      ipc.notify("chat-tool-use-start", {
        conversationId,
        toolName: toolUse.name,
        toolUseId: toolUse.id,
      });
    });

    agent.on("batch-design", (toolCall) => {
      ipc.request("batch-design", { ...toolCall, conversationId });
    });

    agent.on("spawn-agents", (toolCall) => {
      ipc.request("spawn-agents", { ...toolCall, conversationId });
    });

    agent.on("thinking-update", (message) => {
      ipc.notify("thinking-update", { ...message, conversationId });
    });

    agent.on("permission-request", async (event) => {
      try {
        const { result } = await ipc.request<
          {
            conversationId: string;
            toolName: string;
            input: Record<string, unknown>;
          },
          { result: "allow" | "always-allow" | "deny" }
        >(
          "permission-request",
          {
            conversationId,
            toolName: event.toolName,
            input: event.input,
          },
          -1,
        );
        event.resolve(result);
      } catch {
        event.resolve("deny");
      }
    });

    agent.on("completed", (payload: { response: string; error?: string }) => {
      ipc.notify("chat-assistant-final", {
        conversationId,
        fullText: payload.response,
        agentError: payload.error,
      });

      this.pencilAgents.delete(conversationId);
    });

    agent.on("failed", (payload: { message: string; error?: string }) => {
      ipc.notify("chat-error", {
        conversationId,
        message: payload.message || "Agent execution failed",
        error: payload.error,
      });

      this.pencilAgents.delete(conversationId);
    });

    agent.on("stopped", () => {
      this.pencilAgents.delete(conversationId);
    });

    agent.execute(finalPrompt, promptFiles);

    return agent;
  }

  public async removeResource(resourcePath: string): Promise<void> {
    this.logger.info("removeResource:", resourcePath);

    const ipc = this.ipcMap.get(resourcePath);

    if (ipc) {
      this.ipcMap.delete(resourcePath);
      ipc.dispose();
    }

    const conversationIds = this.deviceConversations.get(resourcePath) || [];
    for (const conversationId of conversationIds) {
      const agent = this.pencilAgents.get(conversationId);
      if (agent) {
        await agent.stop();
        this.pencilAgents.delete(conversationId);
      }
    }

    this.deviceConversations.delete(resourcePath);
    this.deviceMap.get(resourcePath)?.dispose();
    this.deviceMap.delete(resourcePath);
    this.initializedDocuments.delete(resourcePath);
  }

  public notifyAll(event: string, payload: any): void {
    for (const [_name, ipc] of this.ipcMap) {
      ipc.notify(event, payload);
    }
  }

  public proxyMcpToolCallRequests() {
    this.requestRouter = new WebSocketRequestRouter(
      this.wsServerManager,
      (filePath: string) => this.getIPC(filePath),
      this.deviceMap,
      () => this.lastFocusedResource || null,
      this.logger,
      this.openDocument,
      (filePath: string, timeoutMs?: number) =>
        this.waitForDocumentReady(filePath, timeoutMs),
    );

    this.requestRouter.start();
  }

  public updateLastResource(lastFocusedResource: string) {
    this.lastFocusedResource = lastFocusedResource;
  }

  public getResourceDevice(resourcePath: string): ResourceDevice | undefined {
    return this.deviceMap.get(resourcePath);
  }

  public getFocusedResource(): ResourceDevice | undefined {
    if (this.lastFocusedResource) {
      return this.deviceMap.get(this.lastFocusedResource);
    }
    return undefined;
  }

  public getFocusedResourceAndIPC(): {
    device: ResourceDevice | undefined;
    ipc: IPCServer | undefined;
  } {
    if (this.lastFocusedResource) {
      const device = this.deviceMap.get(this.lastFocusedResource);
      const ipc = this.ipcMap.get(this.lastFocusedResource);
      return { device, ipc };
    }
    return { device: undefined, ipc: undefined };
  }

  public async getIPC(resourcePath: string): Promise<IPCServer | undefined> {
    if (this.ipcMap.has(resourcePath)) {
      return this.ipcMap.get(resourcePath);
    }

    let absoluteResourcePath: string | undefined;
    if (!path.isAbsolute(resourcePath)) {
      for (const workspaceDir of this.workspaces || []) {
        const joinedFilePath = path.join(workspaceDir, resourcePath);
        const fileStat = fs.statSync(joinedFilePath);

        if (fileStat.isFile()) {
          absoluteResourcePath = joinedFilePath;
        }
      }
    }

    if (absoluteResourcePath) {
      if (this.ipcMap.has(absoluteResourcePath)) {
        return this.ipcMap.get(absoluteResourcePath);
      }

      // Open headless document
      if (this.onOpenDocument) {
        await this.onOpenDocument(absoluteResourcePath);

        if (this.ipcMap.has(absoluteResourcePath)) {
          return this.ipcMap.get(absoluteResourcePath);
        }
      }
    }

    // If no or incorrect resourcePath is defined, attempt to send the MCP
    // command to the last focused resource.
    if (this.lastFocusedResource) {
      return this.ipcMap.get(this.lastFocusedResource);
    }

    return undefined;
  }
}

async function getAgentSystemPrompt(ipc: IPCHost): Promise<string> {
  const { generalRules, designRules } = getRules();
  let general = `${schema}\n\n${generalRules}\n\n${designRules}`;

  const guidelines = (await ipc.request("get-guidelines", {})) as any;
  if (guidelines.success) {
    general += `\n\n# Available Guidelines\n\n${guidelines.result.message}`;
  }

  return general;
}

async function getUserPrompt(
  ipc: IPCHost,
  prompt: string,
  files?: FileAttachment[],
  agentMultiplier?: number,
  userMessageExtension?: string,
): Promise<{ prompt: string; files?: FileAttachment[] }> {
  let finalPrompt = prompt;

  const enableSpawnAgents =
    agentMultiplier !== undefined && agentMultiplier > 1;

  if (enableSpawnAgents) {
    finalPrompt = getPromptWithMultiplier(finalPrompt, agentMultiplier);
  }

  if (userMessageExtension) {
    finalPrompt += `\n\nWe already started examining the target node and the overall document structure to understand what we are working with so we can start designing immediately:\n\n${userMessageExtension}`;
  }

  const editorState = (await ipc.request("get-editor-state")) as any;
  if (editorState.success) {
    finalPrompt += `\n\n# The result of \`get-editor-state\` tool call:\n\n${editorState.result.message}\n\nCalling \`get-editor-state\` in the beginning is not needed.`;
  }

  return { prompt: finalPrompt, files };
}

function getPromptWithMultiplier(
  prompt: string,
  agentMultiplier: number,
): string {
  return `Do the following task by splitting the work in parallel if needed to MAXIMUM ${agentMultiplier - 1} extra designer agents using the \`spawn_agents\` tool besides the currently running agent. This session should be dedicated and continue to design the last part of the split work:

${prompt}

After you called \`spawn_agents\` tool, continue with the last part of the split work.`;
}
