import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { MCPIntegration } from "@ha/shared";
import * as toml from "smol-toml";
import type { MCPSetupPlatformAdapter } from "./types";
import { getMcpConfiguration } from "./util";

const MCP_CONFIG_MAP: Record<MCPIntegration, string> = {
  claudeCodeCLI: path.join(".claude.json"),
  codexCLI: path.join(".codex", "config.toml"),
  geminiCLI: path.join(".gemini", "settings.json"),
  windsurfIDE: path.join(".codeium", "windsurf", "mcp_config.json"),
  cursorCLI: path.join(".cursor", "mcp.json"),
  antigravityIDE: path.join(".gemini", "antigravity", "mcp_config.json"),
  openCodeCLI: path.join(".config", "opencode", "opencode.json"),
  copilotIDE: path.join("mcp.json"),
  kiroCLI: path.join(".kiro", "settings", "mcp.json"),
  claudeDesktop: path.join("Claude", "claude_desktop_config.json"),
};

const PENCIL_MCP_NAME = "pencil";

/**
 * Setup MCP server only for enabled integrations.
 * This allows opt-in control via user settings.
 */
export async function activateIntegrations(
  adapter: MCPSetupPlatformAdapter,
  enabledIntegrations: MCPIntegration[],
): Promise<MCPIntegration[]> {
  const activeIntegrations: MCPIntegration[] = [];

  for (const integration of enabledIntegrations) {
    try {
      await installMCP({ adapter, integration });
      adapter.log.info(`Successfully set up MCP server for ${integration}`);
      activeIntegrations.push(integration);
    } catch (err: any) {
      adapter.log.error("Failed to install MCP for global Codex CLI", err);
    }
  }

  return activeIntegrations;
}

export async function removeIntegrations(
  adapter: MCPSetupPlatformAdapter,
  integrationsToRemove: MCPIntegration[],
) {
  for (const integration of integrationsToRemove) {
    try {
      await removeMCP({
        integration,
        adapter,
      });
      adapter.log.info(`Uninstalled MCP server for ${integration}`);
    } catch (err: any) {
      adapter.log.error("Failed to uninstall MCP for global Codex CLI", err);
    }
  }
}

async function installMCP(config: {
  adapter: MCPSetupPlatformAdapter;
  integration: MCPIntegration;
}): Promise<void> {
  const { integration, adapter } = config;
  const installationPath = adapter.getInstallationPath();
  const configFilePath = getConfigPathForIntegration(adapter, integration);

  const mcpConfiguration = getMcpConfiguration({
    folderPath: installationPath,
    appName: adapter.getAppName(),
  });
  const configExists = fs.existsSync(configFilePath);

  if (!configExists) {
    fs.mkdirSync(path.dirname(configFilePath), {
      recursive: true,
    });
  }

  let content = "{}";
  if (configExists) {
    content = fs.readFileSync(configFilePath, "utf-8");
  } else if (integration === "codexCLI") {
    content = "";
  }

  let toWrite: any;
  let mcpServersKey = "mcpServers";

  // Codex CLI uses Toml
  if (integration === "codexCLI") {
    toWrite = toml.parse(content);
    mcpServersKey = "mcp_servers";
  } else {
    // For empty file create object.
    if (content.trim() === "") {
      content = "{}";
    }
    toWrite = JSON.parse(content);
  }

  if (integration === "openCodeCLI") {
    mcpServersKey = "mcp";
  } else if (integration === "copilotIDE") {
    mcpServersKey = "servers";
  }

  if (!toWrite[mcpServersKey]) {
    toWrite[mcpServersKey] = {};
  }

  const existing = toWrite[mcpServersKey][PENCIL_MCP_NAME] || {};

  toWrite[mcpServersKey][PENCIL_MCP_NAME] = {
    ...existing,
    ...mcpConfiguration,
  };

  // Codex CLI and OpenCodeCLI do not want env.
  if (integration === "codexCLI" || integration === "openCodeCLI") {
    delete toWrite[mcpServersKey][PENCIL_MCP_NAME].env;
  }

  if (
    integration === "claudeCodeCLI" ||
    integration === "copilotIDE" ||
    integration === "claudeDesktop"
  ) {
    toWrite[mcpServersKey][PENCIL_MCP_NAME].type = "stdio";
  }

  // OpenCode CLI doesnt want env, wants type, enabled params and has different command format.
  if (integration === "openCodeCLI") {
    toWrite[mcpServersKey][PENCIL_MCP_NAME].enabled = true;
    toWrite[mcpServersKey][PENCIL_MCP_NAME].type = "local";
    toWrite[mcpServersKey][PENCIL_MCP_NAME].command = [
      toWrite[mcpServersKey][PENCIL_MCP_NAME].command,
      ...toWrite[mcpServersKey][PENCIL_MCP_NAME].args,
    ];
    delete toWrite[mcpServersKey][PENCIL_MCP_NAME].args;
  }

  // For some agents we need to remove name, transport params as those
  // configs do not support it and it crashes.
  if (
    [
      "codexCLI",
      "claudeCodeCLI",
      "geminiCLI",
      "antigravityIDE",
      "openCodeCLI",
      "copilotIDE",
      "kiroCLI",
      "claudeDesktop",
    ].includes(integration)
  ) {
    delete toWrite[mcpServersKey][PENCIL_MCP_NAME].name;
    delete toWrite[mcpServersKey][PENCIL_MCP_NAME].transport;
  }

  // Codex CLI uses Toml
  if (integration === "codexCLI") {
    toWrite = toml.stringify(toWrite);
  } else {
    toWrite = JSON.stringify(toWrite, null, 2);
  }

  fs.writeFileSync(configFilePath, toWrite);

  if (integration === "claudeCodeCLI") {
    await allowMCPToolInClaudeCode(adapter);
  }
}

async function allowMCPToolInClaudeCode(
  adapter: MCPSetupPlatformAdapter,
): Promise<boolean> {
  const allowRule = `mcp__${PENCIL_MCP_NAME}`;
  const claudeCodeSettingsPath = path.join(
    os.homedir(),
    ".claude",
    "settings.json",
  );

  try {
    let obj: { permissions?: { allow?: string[]; deny?: string[] } } = {};
    if (fs.existsSync(claudeCodeSettingsPath)) {
      let objStr = fs.readFileSync(claudeCodeSettingsPath, "utf-8");
      // For empty file create object.
      if (objStr.trim() === "") {
        objStr = "{}";
      }
      obj = JSON.parse(objStr);
    } else {
      fs.mkdirSync(path.dirname(claudeCodeSettingsPath), { recursive: true });
    }

    if (!obj.permissions) {
      obj.permissions = {};
    }

    if (!obj.permissions.allow) {
      obj.permissions.allow = [];
    }

    if (!obj.permissions.allow.includes(allowRule)) {
      obj.permissions.allow.push(allowRule);
      fs.writeFileSync(claudeCodeSettingsPath, JSON.stringify(obj, null, 2));
    }

    return true;
  } catch (err: any) {
    adapter.log.warn("Failed to setup allow rules for claudeCodeCLI", err);
  }

  return false;
}

async function removeMCP(config: {
  adapter: MCPSetupPlatformAdapter;
  integration: MCPIntegration;
}): Promise<boolean> {
  const { adapter, integration } = config;
  const configFilePath = getConfigPathForIntegration(adapter, integration);

  try {
    if (!fs.existsSync(configFilePath)) {
      return false;
    }

    let content = fs.readFileSync(configFilePath, "utf-8");
    let toWrite: any;
    let mcpServersKey = "mcpServers";
    let removed = false;

    // Codex CLI uses Toml.
    if (config.integration === "codexCLI") {
      toWrite = toml.parse(content);
      mcpServersKey = "mcp_servers";
    } else {
      // For empty file create object.
      if (content.trim() === "") {
        content = "{}";
      }
      toWrite = JSON.parse(content);
    }

    if (config.integration === "openCodeCLI") {
      mcpServersKey = "mcp";
    }

    if (toWrite[mcpServersKey] && toWrite[mcpServersKey][PENCIL_MCP_NAME]) {
      delete toWrite[mcpServersKey][PENCIL_MCP_NAME];

      if (config.integration === "codexCLI") {
        toWrite = toml.stringify(toWrite);
      } else {
        toWrite = JSON.stringify(toWrite, null, 2);
      }
      removed = true;
    }

    if (removed) {
      fs.writeFileSync(configFilePath, toWrite);

      if (integration === "claudeCodeCLI") {
        await removeAllowRulesFromClaudeCode(adapter);
      }

      return true;
    }

    return false;
  } catch (err: any) {
    config.adapter.log.warn(
      `Failed to remove MCP server from ${configFilePath}`,
      err,
    );
    return false;
  }
}

async function removeAllowRulesFromClaudeCode(
  adapter: MCPSetupPlatformAdapter,
): Promise<boolean> {
  const allowRule = `mcp__${PENCIL_MCP_NAME}`;
  const claudeCodeSettingsPath = path.join(
    os.homedir(),
    ".claude",
    "settings.json",
  );

  try {
    if (!fs.existsSync(claudeCodeSettingsPath)) {
      return false;
    }

    let objStr = fs.readFileSync(claudeCodeSettingsPath, "utf-8");
    // For empty file create object.
    if (objStr.trim() === "") {
      objStr = "{}";
    }
    const obj: { permissions?: { allow?: string[]; deny?: string[] } } =
      JSON.parse(objStr);

    if (obj.permissions?.allow) {
      const index = obj.permissions.allow.indexOf(allowRule);
      if (index > -1) {
        obj.permissions.allow.splice(index, 1);
        fs.writeFileSync(claudeCodeSettingsPath, JSON.stringify(obj, null, 2));
        adapter.log.info("Removed MCP allow rules from claudeCodeCLI");
        return true;
      }
    }

    return false;
  } catch (err: any) {
    adapter.log.warn("Failed to remove allow rules from claudeCodeCLI", err);
    return false;
  }
}

function getConfigPathForIntegration(
  adapter: MCPSetupPlatformAdapter,
  integration: MCPIntegration,
): string {
  // https://modelcontextprotocol.io/docs/develop/build-server#testing-your-server-with-claude-for-desktop
  if (integration === "claudeDesktop") {
    if (os.platform() === "win32") {
      return path.join(adapter.getAppPath(), MCP_CONFIG_MAP[integration]);
    } else {
      return path.join(
        os.homedir(),
        "Library",
        "Application Support",
        MCP_CONFIG_MAP[integration],
      );
    }
  }
  return path.join(
    integration === "copilotIDE" ? adapter.getAppPath() : os.homedir(),
    MCP_CONFIG_MAP[integration],
  );
}
