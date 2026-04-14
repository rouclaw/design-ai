import batchDesign from "./schemas/batch_design.json";
import batchGet from "./schemas/batch_get.json";
import exportNodes from "./schemas/export_nodes.json";
import findEmptySpaceOnCanvas from "./schemas/find_empty_space_on_canvas.json";
import getEditorState from "./schemas/get_editor_state.json";
import getGuidelines from "./schemas/get_guidelines.json";
import getScreenshot from "./schemas/get_screenshot.json";
import getVariables from "./schemas/get_variables.json";
import openDocument from "./schemas/open_document.json";
import replaceAllMatchingProperties from "./schemas/replace_all_matching_properties.json";
import searchAllUniqueProperties from "./schemas/search_all_unique_properties.json";
import setVariables from "./schemas/set_variables.json";
import snapshotLayout from "./schemas/snapshot_layout.json";
import spawnAgents from "./schemas/spawn_agents.json";

export const toolSchemas = {
  batch_design: batchDesign,
  batch_get: batchGet,
  export_nodes: exportNodes,
  find_empty_space_on_canvas: findEmptySpaceOnCanvas,
  get_editor_state: getEditorState,
  get_guidelines: getGuidelines,
  get_screenshot: getScreenshot,
  get_variables: getVariables,
  open_document: openDocument,
  replace_all_matching_properties: replaceAllMatchingProperties,
  search_all_unique_properties: searchAllUniqueProperties,
  set_variables: setVariables,
  snapshot_layout: snapshotLayout,
  spawn_agents: spawnAgents,
} as const;

export type ToolName = keyof typeof toolSchemas;
export type ToolSchema = (typeof toolSchemas)[ToolName];
