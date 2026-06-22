import path from "path";
import * as clack from "@clack/prompts";
import { StateStore, SettingsStore } from "../config";
import { Filesystem } from "../platform/fs";
import { buildImage, CONTAINER_IMAGE } from "../docker";
import { ContainerClient } from "../container-client";
import { generateContainerName, resolveProjectPath } from "../platform/paths";

export interface ResolvedTarget {
  containerName: string;
  projectName: string;
  projectPath: string;
}

export function resolveTarget(
  fs: Filesystem,
  target: string | undefined,
): ResolvedTarget | null {
  const projectPath = resolveProjectPath(target);
  if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
    clack.log.error(`Project directory does not exist: ${projectPath}`);
    return null;
  }
  const containerName = generateContainerName(projectPath);
  const projectName = path.basename(projectPath);
  return { containerName, projectName, projectPath };
}

export function getBuildDirty(
  stateStore: StateStore,
): "tools" | "harness" | undefined {
  const result = stateStore.load();
  if (!result.ok) return undefined;
  return result.value.buildDirty;
}

export async function ensureImageReady(
  runtime: ContainerClient,
  settingsStore: SettingsStore,
  stateStore: StateStore,
  fs: Filesystem,
): Promise<void> {
  const dirty = getBuildDirty(stateStore);
  if (dirty) {
    const shouldBuild = await clack.confirm({
      message: `Build is stale. Run 'container build ${dirty}' now?`,
      initialValue: false,
    });
    if (clack.isCancel(shouldBuild)) {
      clack.cancel("Run cancelled");
      process.exit(0);
    }
    if (shouldBuild) {
      const result = buildImage(runtime, settingsStore, stateStore, fs, dirty);
      if (!result.ok) {
        clack.log.error("Failed to build image");
        process.exit(1);
      }
      clack.log.success("Image built successfully");
    } else {
      clack.log.warn(
        `Continuing with existing image. Run 'container build ${dirty}' to rebuild.`,
      );
    }
  }

  if (!runtime.imageExists(CONTAINER_IMAGE)) {
    clack.log.warn("Image not found. Building...");
    const result = buildImage(runtime, settingsStore, stateStore, fs, "full");
    if (!result.ok) {
      clack.log.error("Failed to build image");
      process.exit(1);
    }
    clack.log.success("Image built successfully");
  }
}
