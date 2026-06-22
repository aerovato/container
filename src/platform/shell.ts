import { spawnSync } from "child_process";
import { isWindows, isLinux } from "./os";
import { RuntimeBin } from "../types";

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

export function commandExists(executor: Executor, cmd: string): boolean {
  const bin = isWindows() ? "where" : "which";
  const result = executor.spawnSync(bin, [cmd], { stdio: "pipe" });
  return result.status === 0;
}

export function getRuntimeAvailability(executor: Executor): {
  docker: boolean;
  podman: boolean;
} {
  const docker =
    executor.spawnSync("docker", ["--version"], { stdio: "pipe" }).status === 0;
  const podman =
    executor.spawnSync("podman", ["--version"], { stdio: "pipe" }).status === 0;
  return { docker, podman };
}

export function getDefaultRuntime(executor: Executor): RuntimeBin | undefined {
  const { docker, podman } = getRuntimeAvailability(executor);
  if (!docker && !podman) return undefined;
  if (docker && !podman) return "docker";
  if (!docker && podman) return "podman";
  return isLinux() ? "podman" : "docker";
}
