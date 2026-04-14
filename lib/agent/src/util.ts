/**
 * Base Pencil tool names (without prefix) mapped to user-friendly labels
 */
const PENCIL_TOOLS: Record<string, string> = {
  batch_design: "Crafting design...",
  find_empty_space_on_canvas: "Finding available space...",
  get_guidelines: "Loading guidelines...",
  get_screenshot: "Analyzing screenshot...",
  get_editor_state: "Checking current state...",
  get_variables: "Checking variables...",
  set_variables: "Updating variables...",
  replace_all_matching_properties: "Updating matching properties...",
  search_all_unique_properties: "Analyzing properties...",
  batch_get: "Reading...",
  snapshot_layout: "Analyzing layout...",
  update_properties: "Updating properties...",
  spawn_agents: "Splitting work...",
};

/**
 * Add prefix to all tool names
 */
function addPrefix(
  tools: Record<string, string>,
  prefix: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(tools)) {
    result[`${prefix}${key}`] = value;
  }
  return result;
}

/**
 * Cached tool labels for Pencil MCP tools (Claude format: mcp__pencil__)
 */
const PENCIL_TOOL_LABELS_CLAUDE: Readonly<Record<string, string>> = addPrefix(
  PENCIL_TOOLS,
  "mcp__pencil__",
);

/**
 * Cached tool labels for Pencil MCP tools (Codex format: pencil__)
 */
const PENCIL_TOOL_LABELS_CODEX: Readonly<Record<string, string>> = addPrefix(
  PENCIL_TOOLS,
  "pencil__",
);

/**
 * Get tool name to user-friendly label mapping for Pencil MCP tools.
 * Returns a cached object - do not modify!
 *
 * @param format - Tool name format: 'claude' (mcp__pencil__) or 'codex' (pencil__)
 */
export function getPencilToolLabels(
  format: "claude" | "codex" = "claude",
): Readonly<Record<string, string>> {
  return format === "codex"
    ? PENCIL_TOOL_LABELS_CODEX
    : PENCIL_TOOL_LABELS_CLAUDE;
}
