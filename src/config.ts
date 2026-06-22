// eslint-disable-next-line no-restricted-imports
import type fs from "fs";
import { z } from "zod";
import {
  SettingsSchema,
  StateSchema,
  Result,
  Settings,
  StateData,
} from "./types";
import { APPDATA_DIR, CONFIGS_DIR, TEMP_DIR } from "./platform/paths";

export type FsReader = Pick<
  typeof fs,
  | "existsSync"
  | "readFileSync"
  | "writeFileSync"
  | "mkdirSync"
  | "chmodSync"
  | "statSync"
  | "readdirSync"
  | "cpSync"
>;

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
