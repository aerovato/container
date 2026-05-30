import path from "path";
import { StateStore } from "../config";
import { generateContainerName } from "../docker";
import { RuntimeBin } from "../types";
import { Executor } from "../runtime";

export function resolveProjectPath(projectPath: string | undefined): string {
  if (!projectPath) {
    return process.cwd();
  }
  return path.resolve(projectPath);
}

export function resolveContainerTarget(target: string | undefined): string {
  return generateContainerName(resolveProjectPath(target));
}

export function getBuildDirty(
  stateStore: StateStore,
): "core" | "harness" | undefined {
  const result = stateStore.load();
  if (!result.ok) return undefined;
  return result.value.buildDirty;
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
  return process.platform === "linux" ? "podman" : "docker";
}
