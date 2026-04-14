export type ThirdPartyLoginType =
  | "aws-bedrock"
  | "google-vertex"
  | "microsoft-foundry"
  | "custom";

export type LoginType = "subscription" | "api-key" | ThirdPartyLoginType;

export type AgentType = "claude" | "codex";

type AgentSessionBase = {
  sessionId: string;
};

type AgentSessionToolBase = AgentSessionBase & {
  id: string;
};

export type AgentSessionStartEvent = AgentSessionBase & {
  type: "start";
};

export type AgentSessionEndEvent = AgentSessionBase & {
  type: "end";
  content:
    | {
        reason: "finished";
        response: string;
      }
    | {
        reason: "stopped";
      }
    | {
        reason: "failed";
        message: string;
      };
};

export type AgentSessionMessageEvent = AgentSessionBase & {
  type: "message";
  source: "assistant" | "user";
  text: string;
};

export type AgentSessionThinkingEvent = AgentSessionBase & {
  type: "thinking";
  text: string;
};

export type AgentSessionStreamMessageEvent = AgentSessionBase & {
  type: "stream-message";
  text: string;
};

export type AgentSessionToolUseStartEvent = AgentSessionToolBase & {
  type: "tool-use-start";
  name: string;
};

export type AgentSessionToolUseEvent = AgentSessionToolBase & {
  type: "tool-use";
  name: string;
  input: any;
  streaming: boolean;
};

export type AgentSessionToolResultEvent = AgentSessionToolBase & {
  type: "tool-result";
  output: any;
  success: boolean;
};

export type AgentSessionPermissionRequestEvent = AgentSessionBase & {
  type: "permission-request";
  name: string;
  input: Record<string, unknown>;
  resolve: (result: "allow" | "always-allow" | "deny") => void;
};

export type AgentSessionEvent =
  | AgentSessionStartEvent
  | AgentSessionEndEvent
  | AgentSessionMessageEvent
  | AgentSessionThinkingEvent
  | AgentSessionStreamMessageEvent
  | AgentSessionToolUseStartEvent
  | AgentSessionToolUseEvent
  | AgentSessionToolResultEvent
  | AgentSessionPermissionRequestEvent;

export type AgentConfig = {
  claude: {
    loginType: LoginType;
    apiKeyStored: boolean;
    defaultModel: string;
    supportedModels: SupportedModel[];
  };
  codex: {
    loginType: LoginType;
    apiKeyStored: boolean;
    defaultModel: string;
    supportedModels: SupportedModel[];
  };
  allSupportedModels: SupportedModel[];
};

export type ClaudeConnectionStatus = {
  accountInfoEmail?: string;
  // Indicates the type of login used (subscription, api-key, or third-party provider)
  loginType: LoginType;
  // Indicates that the user stored credentials with us (API key or third-party config)
  apiKeyStored?: boolean;
};

export type CodexConnectionStatus = {
  // Indicates the type of login used (subscription, api-key, or third-party provider)
  loginType: LoginType;
  // Indicates that the user stored credentials with us (API key or third-party config)
  apiKeyStored?: boolean;
};

export type SupportedModel = {
  displayName: string;
  id: string;
  description?: string;
};

export function getSupportedModels(
  agentType: AgentType,
  login: LoginType,
): SupportedModel[] {
  if (agentType === "codex") {
    return [
      { displayName: "GPT 5.3 Codex (Best)", id: "gpt-5.3-codex" },
      { displayName: "GPT 5.4", id: "gpt-5.4" },
      { displayName: "GPT 5.4 Mini", id: "gpt-5.4-mini" },
      { displayName: "GPT 5.2 Codex", id: "gpt-5.2-codex" },
      { displayName: "GPT 5.2", id: "gpt-5.2" },
      { displayName: "GPT 5.1 Codex Max", id: "gpt-5.1-codex-max" },
      { displayName: "GPT 5.1 Codex Mini", id: "gpt-5.1-codex-mini" },
    ];
  }

  if (login === "subscription" || login === "api-key") {
    return [
      {
        displayName: "Claude Opus 4.6 (Best)",
        id: "claude-opus-4-6",
        description: "Most capable, higher cost",
      },
      {
        displayName: "Claude Sonnet 4.6",
        id: "claude-sonnet-4-6",
        description: "Fast, balanced performance",
      },
      {
        displayName: "Claude Haiku 4.5",
        id: "claude-haiku-4-5",
        description: "Fastest, lowest cost",
      },
    ];
  } else {
    // Third-party logins may have different models available
    return [{ displayName: "Custom Model", id: "custom-model" }];
  }
}

export function getDefaultModel(
  agentType: AgentType,
  login: LoginType,
): string {
  if (agentType === "codex") {
    return "gpt-5.3-codex";
  }

  if (login === "subscription" || login === "api-key") {
    return "claude-opus-4-6";
  } else {
    // Third-party logins may have different models available
    return "custom-model";
  }
}

export function mapCanvasModelsToThirdParty(
  agentType: AgentType,
  login: LoginType,
  canvasModelID?: string,
): string {
  if (!canvasModelID) {
    return getDefaultModel(agentType, login);
  }

  if (agentType === "codex") {
    if (canvasModelID === "claude-4.5-haiku") {
      return "gpt-5.1-codex-mini";
    } else if (canvasModelID === "claude-4.5-sonnet") {
      return "gpt-5.3-codex";
    } else if (canvasModelID === "claude-4.5-opus") {
      return "gpt-5.3-codex";
    } else {
      return canvasModelID;
    }
  }

  if (login === "subscription" || login === "api-key") {
    if (canvasModelID === "claude-4.5-haiku") {
      return "claude-haiku-4-5";
    } else if (canvasModelID === "claude-4.5-sonnet") {
      return "claude-sonnet-4-6";
    } else if (canvasModelID === "claude-4.5-opus") {
      return "claude-opus-4-6";
    } else {
      return canvasModelID;
    }
  } else {
    // Third-party logins may have different models available
    return "custom-model";
  }
}

export function getAgentTypeFromModelID(modelID: string): AgentType {
  return modelID.startsWith("gpt-") ? "codex" : "claude";
}

export function parseToolName(fullName: string): string | undefined {
  const parts = fullName.split("__");
  return parts.pop();
}

export function getDefaultAgentConfig(): AgentConfig {
  const claudeModels = getSupportedModels("claude", "subscription");
  const codexModels = getSupportedModels("codex", "subscription");

  return {
    claude: {
      loginType: "subscription",
      apiKeyStored: false,
      defaultModel: getDefaultModel("claude", "subscription"),
      supportedModels: claudeModels,
    },
    codex: {
      loginType: "subscription",
      apiKeyStored: false,
      defaultModel: getDefaultModel("codex", "subscription"),
      supportedModels: codexModels,
    },
    allSupportedModels: [...claudeModels, ...codexModels],
  };
}
