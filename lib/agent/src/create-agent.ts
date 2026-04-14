import type { AgentType } from "@ha/shared";
import { ClaudeAgent } from "./claude/index.js";
import { CodexAgent } from "./codex/index.js";
import type { AgentConfig } from "./config.js";
import type { PencilAgent } from "./types.js";

export function createAgent(type: AgentType, config: AgentConfig): PencilAgent {
  switch (type) {
    case "claude": {
      return new ClaudeAgent(config);
    }
    case "codex": {
      return new CodexAgent(config);
    }

    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}
