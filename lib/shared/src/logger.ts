export type LogLevel = "debug" | "info" | "warn" | "error";

export interface ILogger {
  setLevel(level: LogLevel): void;
  setEnabled(enabled: boolean): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

interface LoggerConfig {
  level: LogLevel;
  enabled: boolean;
}

export class Logger implements ILogger {
  private config: LoggerConfig = {
    level: "debug",
    enabled: true,
  };

  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  private shouldLog(level: LogLevel): boolean {
    return (
      this.config.enabled &&
      this.levels[level] >= this.levels[this.config.level]
    );
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      console.log("[DEBUG]", ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.info("[INFO]", ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      console.warn("[WARN]", ...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog("error")) {
      console.error("[ERROR]", ...args);
    }
  }
}

export const logger = new Logger();
