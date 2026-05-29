import path from "path";
import { StateStore } from "../config";
import { generateContainerName } from "../docker";

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
