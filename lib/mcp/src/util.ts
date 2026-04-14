import os from "node:os";
import path from "node:path";
import type { MCPServerConfig } from "./types";

/**
 * Get the platform-specific MCP server binary name.
 */
export function getMcpBinaryName(): string {
  const platform = os.platform();
  const arch = os.arch();

  let platformSuffix: string;

  if (platform === "win32") {
    platformSuffix = "-windows-x64.exe";
  } else if (platform === "darwin") {
    if (arch === "arm64") {
      platformSuffix = "-darwin-arm64";
    } else {
      platformSuffix = "-darwin-x64";
    }
  } else if (platform === "linux") {
    if (arch === "arm64") {
      platformSuffix = "-linux-arm64";
    } else {
      platformSuffix = "-linux-x64";
    }
  } else {
    // Fallback to generic name
    platformSuffix = "";
  }

  return `mcp-server${platformSuffix}`;
}

/**
 * Get MCP server configuration for the Pencil MCP server.
 */
export function getMcpConfiguration({
  folderPath,
  appName,
  conversationId,
  enableSpawnAgents,
}: {
  folderPath: string;
  appName: string;
  conversationId?: string;
  enableSpawnAgents?: boolean;
}): MCPServerConfig {
  return {
    name: "pencil",
    transport: "stdio",
    command: path.join(folderPath, "out", getMcpBinaryName()),
    args: [
      "--app",
      appName,
      ...(conversationId ? ["--conversation_id", conversationId] : []),
      ...(enableSpawnAgents ? ["--enable_spawn_agents"] : []),
    ],
    env: {},
  };
}
