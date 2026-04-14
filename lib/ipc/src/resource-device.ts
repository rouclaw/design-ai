import type { FileAttachment } from "@ha/agent";
import type { AgentType } from "@ha/shared";

export interface ResourceDevice {
  getResourcePath(): string;
  getResourceContents(): string;
  getIsDirty(): boolean;
  getDeviceId(): string;
  getSession():
    | {
        email: string;
        token: string;
      }
    | undefined;
  setSession(email: string, token: string): void;
  readFile(filePath: string): Promise<Uint8Array<ArrayBufferLike>>;
  ensureDir(dirPath: string): Promise<void>;
  writeFile(
    filePath: string,
    contents: Uint8Array<ArrayBufferLike>,
  ): Promise<void>;
  saveResource(params: {
    userAction: boolean;
    saveAs?: boolean;
    destinationPath?: string;
  }): Promise<boolean>;
  submitPrompt(
    prompt: string,
    model: string | undefined,
    selectedIDs?: string[],
    files?: FileAttachment[],
  ): Promise<void>;
  fileChanged(): void;
  importFiles(
    files: { fileName: string; fileContents: ArrayBufferLike }[],
  ): Promise<{ filePath: string }[]>;
  importFileByName(
    fileName: string,
    fileContents: ArrayBufferLike,
  ): Promise<{ filePath: string }>;
  importFileByUri(
    fileUriString: string,
  ): Promise<{ filePath: string; fileContents: ArrayBufferLike }>;
  openDocument(type: string): Promise<void>;
  getActiveThemeKind(): "dark" | "light";
  toggleDesignMode(): void;
  setLeftSidebarVisible(visible: boolean): void;
  getLastOnlineAt(): number | undefined;
  setLastOnlineAt(timestamp: number): void;
  signOut(): void;
  openExternalUrl(url: string): void;
  getAgentPackagePath(type: AgentType): string | undefined;
  execPath(): string | undefined;
  getAgentEnv(): { [envVar: string]: string | undefined } | undefined;
  agentIncludePartialMessages(): boolean | undefined;
  isTemporary(): boolean;
  getResourceFolderPath(): Promise<string>;
  dispose(): Promise<void>;
  getAgentApiKey(type: AgentType): string | undefined;
  saveTempFile(base64Data: string, ext: string, name?: string): Promise<string>;
  cleanupTempFiles(paths: string[]): Promise<void>;
  getWorkspaceFolderPath(): Promise<string | undefined>;
  setWorkspaceFolderPath(workspacePath: string): Promise<void>;
  loadFile(filePath: string): void;
  findLibraries(): Promise<string[]>;
  turnIntoLibrary(): Promise<void>;
  browseLibraries(multiple: boolean): Promise<string[] | undefined>;
}
