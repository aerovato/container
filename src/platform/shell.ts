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

const RUNTIME_READY_ATTEMPTS = 15;
const RUNTIME_READY_DELAY_MS = 1000;

function runtimeReady(executor: Executor, runtime: RuntimeBin): boolean {
  return executor.spawnSync(runtime, ["info"], { stdio: "pipe" }).status === 0;
}

function waitForRuntime(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, RUNTIME_READY_DELAY_MS));
}

function startDocker(executor: Executor): boolean {
  if (isLinux()) {
    const userServiceStatus = executor.spawnSync(
      "systemctl",
      ["--user", "start", "docker"],
      { stdio: "pipe" },
    ).status;
    if (userServiceStatus === 0) return true;

    const desktopServiceStatus = executor.spawnSync(
      "systemctl",
      ["--user", "start", "docker-desktop"],
      { stdio: "pipe" },
    ).status;
    if (desktopServiceStatus === 0) return true;

    return (
      executor.spawnSync("sudo", ["systemctl", "start", "docker"], {
        stdio: "inherit",
      }).status === 0
    );
  }

  return (
    executor.spawnSync("docker", ["desktop", "start"], {
      stdio: "pipe",
    }).status === 0
  );
}

function startPodman(executor: Executor): boolean {
  return (
    executor.spawnSync("podman", ["machine", "start"], {
      stdio: "pipe",
    }).status === 0
  );
}

export async function ensureRuntimeReady(
  executor: Executor,
  runtime: RuntimeBin,
  onStart: () => void,
): Promise<boolean> {
  if (runtimeReady(executor, runtime)) return true;
  if (runtime === "podman" && isLinux()) return false;

  onStart();

  const started =
    runtime === "docker" ? startDocker(executor) : startPodman(executor);
  if (!started) return false;

  for (let attempt = 0; attempt < RUNTIME_READY_ATTEMPTS; attempt++) {
    if (runtimeReady(executor, runtime)) return true;
    if (attempt < RUNTIME_READY_ATTEMPTS - 1) await waitForRuntime();
  }

  return false;
}
