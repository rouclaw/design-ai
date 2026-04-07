import ElectronStore from "electron-store";
import type { LoginType } from "@ha/shared";
import { DesktopMCPAdapter } from "./desktop-mcp-adapter";

export type WindowBounds = {
  width: number;
  height: number;
  x?: number;
  y?: number;
};

export type DesktopConfigSchema = {
  windowBounds: WindowBounds;
  recentFiles: string[];
  claudeApiKey?: string;
  claudeLoginType: LoginType;
  enabledIntegrations: string[];
  codexApiKey?: string;
  codexLoginType: LoginType;
  workspaceFolders: Record<string, string>;
  installOnAppQuit?: boolean;
};

const defaults: DesktopConfigSchema = {
  windowBounds: {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined,
  },
  recentFiles: [],
  claudeApiKey: undefined,
  claudeLoginType: "subscription",
  enabledIntegrations: DesktopMCPAdapter.getSupportedIntegrations(),
  codexApiKey: undefined,
  codexLoginType: "subscription",
  workspaceFolders: {},
  installOnAppQuit: undefined,
};

type ElectronStoreConstructor = new <T extends object>(options?: ConstructorParameters<typeof ElectronStore>[0]) => ElectronStore<T>;

const Store = (
  typeof ElectronStore === "function" ? ElectronStore : ElectronStore.default
) as ElectronStoreConstructor;

const store = new Store<DesktopConfigSchema>({ defaults });

class DesktopConfig {
  constructor(private readonly store: ElectronStore<DesktopConfigSchema>) {}

  private handleMalformedStore(error: unknown): boolean {
    const errorName = error instanceof Error ? error.name : String(error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      error instanceof SyntaxError ||
      errorName === "SyntaxError" ||
      errorMessage.toLowerCase().includes("expected")
    ) {
      this.store.clear();
      return true;
    }

    return false;
  }

  get<K extends keyof DesktopConfigSchema>(key: K): DesktopConfigSchema[K] {
    try {
      return this.store.get(key) as DesktopConfigSchema[K];
    } catch (error) {
      if (this.handleMalformedStore(error)) {
        return defaults[key];
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes("eperm")) {
        return defaults[key];
      }

      throw error;
    }
  }

  delete<K extends keyof DesktopConfigSchema>(key: K) {
    try {
      this.store.delete(key);
    } catch (error) {
      if (this.handleMalformedStore(error)) {
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes("eperm")) {
        return;
      }

      throw error;
    }
  }

  set<K extends keyof DesktopConfigSchema>(key: K, value: DesktopConfigSchema[K]) {
    try {
      this.store.set(key, value);
    } catch (error) {
      if (this.handleMalformedStore(error)) {
        this.store.set(key, value);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes("eperm")) {
        return;
      }

      if (errorMessage.toLowerCase().includes("enospc")) {
        return;
      }

      throw error;
    }
  }
}

export const desktopConfig = new DesktopConfig(store);
