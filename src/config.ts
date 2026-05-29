import path from "path";
import os from "os";
import { z } from "zod";
import {
  SettingsSchema,
  StateSchema,
  Result,
  Settings,
  StateData,
} from "./types";

export const APPDATA_DIR = path.join(os.homedir(), ".code-container");
export const CONFIGS_DIR = path.join(APPDATA_DIR, "configs");
export const TEMP_DIR = path.join(APPDATA_DIR, "temp");
export const SETTINGS_PATH = path.join(APPDATA_DIR, "settings.json");
export const STATE_PATH = path.join(TEMP_DIR, "state.json");
export const USER_DOCKERFILE_PATH = path.join(APPDATA_DIR, "Dockerfile.User");

export interface FsReader {
  existsSync(filePath: string): boolean;
  readFileSync(filePath: string, encoding: string): string;
  writeFileSync(
    filePath: string,
    content: string,
    options?: { mode?: number },
  ): void;
  mkdirSync(
    dirPath: string,
    options?: { recursive?: boolean; mode?: number },
  ): void;
  chmodSync(filePath: string, mode: number): void;
  statSync(filePath: string): { isDirectory(): boolean };
  readdirSync(dirPath: string): string[];
  cpSync(source: string, dest: string, options?: { recursive?: boolean }): void;
}

function parseAndValidate<T>(
  content: string,
  schema: z.ZodSchema<T>,
): Result<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, error: "validation_failed" };
  }
  return { ok: true, value: result.data };
}

export class SettingsStore {
  constructor(
    private fs: FsReader,
    private filePath: string,
  ) {}

  load(): Result<Settings> {
    if (!this.fs.existsSync(this.filePath)) {
      return { ok: true, value: {} };
    }
    const content = this.fs.readFileSync(this.filePath, "utf-8");
    return parseAndValidate(content, SettingsSchema);
  }

  save(data: Settings): Result<void> {
    ensureAppdataDir(this.fs);
    try {
      this.fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), {
        mode: 0o600,
      });
      return { ok: true, value: undefined };
    } catch {
      return { ok: false, error: "permission_denied" };
    }
  }
}

export class StateStore {
  constructor(
    private fs: FsReader,
    private filePath: string,
  ) {}

  load(): Result<StateData> {
    if (!this.fs.existsSync(this.filePath)) {
      return { ok: true, value: {} };
    }
    const content = this.fs.readFileSync(this.filePath, "utf-8");
    return parseAndValidate(content, StateSchema);
  }

  save(data: StateData): Result<void> {
    ensureTempDir(this.fs);
    try {
      this.fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), {
        mode: 0o600,
      });
      return { ok: true, value: undefined };
    } catch {
      return { ok: false, error: "permission_denied" };
    }
  }
}

export function ensureAppdataDir(fs: FsReader): void {
  if (!fs.existsSync(APPDATA_DIR)) {
    fs.mkdirSync(APPDATA_DIR, { recursive: true, mode: 0o700 });
  } else {
    fs.chmodSync(APPDATA_DIR, 0o700);
  }
}

export function ensureConfigDir(fs: FsReader): void {
  ensureAppdataDir(fs);
  if (!fs.existsSync(CONFIGS_DIR)) {
    fs.mkdirSync(CONFIGS_DIR, { recursive: true, mode: 0o700 });
  } else {
    fs.chmodSync(CONFIGS_DIR, 0o700);
  }
}

export function ensureTempDir(fs: FsReader): void {
  ensureAppdataDir(fs);
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true, mode: 0o700 });
  }
}
