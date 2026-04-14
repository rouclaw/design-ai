import type { MCPIntegration } from "@ha/shared";

/**
 * MCP server configuration for STDIO transport (local process)
 */
export interface MCPStdioServerConfig {
  /** Server name/identifier */
  name: string;
  /** Transport type */
  transport: "stdio";
  /**
   * Command to run the MCP server.
   * Example: "node", "python", "/path/to/binary"
   */
  command: string;
  /**
   * Arguments for the command.
   * Example: ["server.js", "--port", "8080"]
   */
  args: string[];
  /**
   * Environment variables for the server process.
   */
  env: Record<string, string>;
}

/**
 * MCP server configuration for remote transport (HTTP/SSE)
 */
export interface MCPRemoteServerConfig {
  /** Server name/identifier */
  name: string;
  /**
   * Transport type.
   * - "sse": Server-Sent Events over HTTP
   * - "streamable_http": Streamable HTTP transport
   */
  transport: "sse" | "streamable_http";
  /**
   * Server URL.
   * Example: "https://mcp.example.com/server"
   */
  url: string;
  /**
   * Optional HTTP headers.
   */
  headers?: Record<string, string>;
}

/**
 * MCP server configuration
 * Can be used with Claude
 */
export type MCPServerConfig = MCPStdioServerConfig | MCPRemoteServerConfig;

/**
 * Platform adapter interface for MCP setup.
 * This allows the MCP setup logic to be platform-independent by abstracting
 * platform-specific operations (e.g., vscode APIs vs Electron APIs).
 */
export interface MCPSetupPlatformAdapter {
  /**
   * Get the installation path for the current platform.
   * In VSCode: Returns the VSCode extension installation path
   * In Desktop: Returns the desktop app installation directory
   */
  getInstallationPath(): string;

  /**
   * Get the extension path for a specific external extension by ID.
   * In VSCode: Uses vscode.extensions.getExtension(extensionId)
   * In Desktop: Returns undefined (external extensions not applicable)
   */
  getExternalExtensionPath(extensionId: string): string | undefined;

  getAppPath(): string;

  log: {
    info(message: string): void;
    warn(message: string, error?: any): void;
    error(message: string, error?: any): void;
  };

  setupIntegrations(enabledIntegrations?: MCPIntegration[]): Promise<void>;

  getAppName(): string;

  saveMCPAppInfo(content: string): Promise<boolean>;

  toggleIntegration(integration: MCPIntegration, state: boolean): Promise<void>;
}
