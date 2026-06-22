// eslint-disable-next-line no-restricted-imports
import { spawnSync } from "child_process";

export interface SpawnSyncResult {
  status: number | null;
  stdout: string | Buffer;
  stderr: string | Buffer;
}

export interface Executor {
  spawnSync(bin: string, args: string[], options?: object): SpawnSyncResult;
}

export function createExecutor(): Executor {
  return { spawnSync };
}
