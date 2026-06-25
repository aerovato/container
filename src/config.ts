import path from "path";
import { z } from "zod";
import {
  SettingsSchema,
  StateSchema,
  Result,
  Settings,
  StateData,
  ConfigMount,
} from "./types";
import { Filesystem } from "./platform/fs";
import { CONFIGS_DIR } from "./platform/paths";

export function configMountSourcePath(config: ConfigMount): string {
  return path.join(CONFIGS_DIR, config.config);
}

export function ensureConfigExists(fs: Filesystem, config: ConfigMount): void {
  const destPath = configMountSourcePath(config);

  if (fs.existsSync(destPath)) {
    const stat = fs.statSync(destPath);
    if (config.kind === "file" && stat.isFile()) return;
    if (config.kind === "directory" && stat.isDirectory()) return;
    fs.rmSync(destPath, { recursive: true, force: true });
  }

  const parentDir = path.dirname(destPath);
  if (!fs.existsSync(parentDir)) {
    fs.secureMkdir(parentDir);
  }

  if (config.kind === "file") {
    fs.secureWriteFile(destPath, config.defaultContents ?? "");
    return;
  }

  fs.secureMkdir(destPath);
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
    private fs: Filesystem,
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
    this.fs.ensureAppdataDir();
    try {
      this.fs.secureWriteFile(this.filePath, JSON.stringify(data, null, 2));
      return { ok: true, value: undefined };
    } catch {
      return { ok: false, error: "permission_denied" };
    }
  }
}

export class StateStore {
  constructor(
    private fs: Filesystem,
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
    this.fs.ensureTempDir();
    try {
      this.fs.secureWriteFile(this.filePath, JSON.stringify(data, null, 2));
      return { ok: true, value: undefined };
    } catch {
      return { ok: false, error: "permission_denied" };
    }
  }
}
