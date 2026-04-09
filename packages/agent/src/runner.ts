#!/usr/bin/env node
/**
 * Standalone Agent Runner
 *
 * Runs an agent independently without requiring vscode-extension, desktop, or CLI projects.
 * The agent connects to an already-running WebSocket server.
 *
 * Usage:
 *   agent-runner --agent-type claude --prompt "Create a button" --file-path design.pen
 *   agent-runner --agent-type codex --prompt "Write a function"
 */

import { type ChildProcess, spawn } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { getMcpBinaryName } from "@ha/mcp";
import type { AgentType } from "@ha/shared";

let __filename: string;
let __dirname: string;

try {
	// ESM: import.meta.url is available
	__filename = fileURLToPath(import.meta.url);
	__dirname = path.dirname(__filename);
} catch {
	// CJS: Fall back to Node.js global variables
	// These are available at runtime in CommonJS context
	__filename = (globalThis as { __filename?: string }).__filename ?? "";
	__dirname = (globalThis as { __dirname?: string }).__dirname ?? "";
}

console.log("Current working directory (Runner):");
console.log(process.cwd());

// Simple logger implementation
const logger = {
	setLevel: () => {},
	setEnabled: () => {},
	info: (...args: unknown[]) => console.log("[INFO]", ...args),
	warn: (...args: unknown[]) => console.warn("[WARN]", ...args),
	error: (...args: unknown[]) => console.error("[ERROR]", ...args),
	debug: (...args: unknown[]) => console.log("[DEBUG]", ...args),
};

interface RunnerConfig {
	agentType: AgentType;
	prompt: string;
	filePath?: string;
	wsUrl?: string;
	wsPort: number;
	mcpServerPath?: string;
	model?: string;
	systemPrompt?: string;
	apiKey?: string;
}

function parseArgs(): RunnerConfig {
	const args = process.argv.slice(2);
	let agentType: AgentType = "claude";
	let prompt = "";
	let filePath: string | undefined;
	let wsUrl: string | undefined;
	let wsPort: number = 50501;
	let mcpServerPath: string | undefined;
	let model: string | undefined;
	let systemPrompt: string | undefined;
	let apiKey: string | undefined;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--agent-type" && i + 1 < args.length) {
			agentType = args[i + 1] as AgentType;
		} else if (args[i] === "--prompt" && i + 1 < args.length) {
			prompt = args[i + 1];
		} else if (args[i] === "--file-path" && i + 1 < args.length) {
			filePath = args[i + 1];
		} else if (args[i] === "--ws-url" && i + 1 < args.length) {
			wsUrl = args[i + 1];
		} else if (args[i] === "--ws-port" && i + 1 < args.length) {
			wsPort = parseInt(args[i + 1], 10);
		} else if (args[i] === "--mcp-server-path" && i + 1 < args.length) {
			mcpServerPath = args[i + 1];
		} else if (args[i] === "--model" && i + 1 < args.length) {
			model = args[i + 1];
		} else if (args[i] === "--system-prompt" && i + 1 < args.length) {
			systemPrompt = args[i + 1];
		} else if (args[i] === "--api-key" && i + 1 < args.length) {
			apiKey = args[i + 1];
		} else if (args[i] === "--help" || args[i] === "-h") {
			console.log(`
Standalone Agent Runner

Usage:
  agent-runner [options]

Required:
  --agent-type <type>       Agent type: claude, codex
  --prompt <text>           Prompt for the agent

Optional:
  --file-path <path>        Path to .pen file (if omitted, uses process.cwd()/tmp)
  --ws-url <url>            WebSocket server URL (default: ws://localhost:50501)
  --ws-port <number>        WebSocket server port (default: 50501)
  --mcp-server-path <path>  Path to MCP server binary (auto-detected if omitted)
  --model <model>           Model to use
  --system-prompt <text>    System prompt
  --api-key <key>           API key
  --help, -h                Show this help message

Examples:
  # Claude agent
  agent-runner --agent-type claude \\
    --prompt "Create a blue button" --file-path design.pen

  # Codex agent
  agent-runner --agent-type codex \\
    --prompt "Create a blue button"
`);
			process.exit(0);
		}
	}

	if (!prompt) {
		logger.error("--prompt is required");
		process.exit(1);
	}

	return {
		agentType,
		prompt,
		filePath,
		wsUrl,
		wsPort,
		mcpServerPath,
		model,
		systemPrompt,
		apiKey,
	};
}

/**
 * Start MCP server process
 */
function startMcpServer(mcpServerPath: string, wsPort: number): ChildProcess {
	logger.info(`Starting MCP server...`);

	const mcpProcess = spawn(mcpServerPath, ["--ws-port", wsPort.toString()]);

	mcpProcess.stdout?.on("data", (data) => {
		logger.debug(`[MCP] ${data.toString().trim()}`);
	});

	mcpProcess.stderr?.on("data", (data) => {
		logger.debug(`[MCP stderr] ${data.toString().trim()}`);
	});

	mcpProcess.on("error", (error) => {
		logger.error(`MCP process error:`, error);
	});

	mcpProcess.on("exit", (code) => {
		logger.info(`MCP process exited with code ${code}`);
	});

	return mcpProcess;
}

async function main() {
	const config = parseArgs();

	try {
		// Resolve MCP server path
		let mcpServerPath = config.mcpServerPath;
		if (!mcpServerPath) {
			// Auto-detect MCP server binary
			const mcpBinaryName = getMcpBinaryName();
			// Assume it's in servers/mcp/ relative to the project root
			const projectRoot = path.resolve(__dirname, "../../../");
			mcpServerPath = path.join(projectRoot, "servers/mcp", mcpBinaryName);
			logger.info(`Auto-detected MCP server: ${mcpServerPath}`);
		}

		const mcpProcess = startMcpServer(mcpServerPath, config.wsPort);

		// Wait for MCP server to start
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// const agentConfig = {
		//   logger,
		//   filePath: config.filePath,
		//   model: config.model,
		//   systemPrompt: config.systemPrompt,
		//   apiKey: config.apiKey,
		//   mcpServers: [
		//     {
		//       name: "pencil",
		//       transport: "stdio" as const,
		//       command: mcpServerPath,
		//       args: ["--ws-port", config.wsPort!.toString()],
		//       env: {},
		//     },
		//   ],
		// };

		// Execute agent
		logger.info(`Starting ${config.agentType} agent...`);
		logger.info(`Prompt: ${config.prompt}`);

		// const result = await createAgent(
		//   config.agentType,
		//   agentConfig,
		// );

		// logger.info("=".repeat(60));
		// logger.info(`Agent execution ${result.success ? "completed" : "failed"}`);
		// logger.info(`Status: ${result.status}`);
		// if (result.error) {
		//   logger.error(`Error: ${result.error}`);
		// }
		// if (result.response) {
		//   logger.info(`Response: ${result.response}`);
		// }
		// logger.info("=".repeat(60));

		// Cleanup
		mcpProcess.kill();
		// process.exit(result.success ? 0 : 1);
	} catch (error) {
		logger.error("Fatal error:", error);
		process.exit(1);
	}
}

main().catch((error) => {
	logger.error("Unhandled error:", error);
	process.exit(1);
});
