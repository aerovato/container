import { z } from "zod";
import {
  SettingsSchema,
  StateSchema,
  Result,
  Settings,
  StateData,
} from "./types";
import { Filesystem } from "./platform/fs";

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
