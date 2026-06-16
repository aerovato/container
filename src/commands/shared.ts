import path from "path";
import * as clack from "@clack/prompts";
import { StateStore, SettingsStore, FsReader } from "../config";
import { generateContainerName, buildImage, CONTAINER_IMAGE } from "../docker";
import { RuntimeBin } from "../types";
import { Runtime, Executor } from "../runtime";

export function resolveProjectPath(projectPath: string | undefined): string {
  if (!projectPath) {
    return process.cwd();
  }
  return path.resolve(projectPath);
}

export function resolveContainerName(target: string | undefined): string {
  return generateContainerName(resolveProjectPath(target));
}

export interface ResolvedTarget {
  containerName: string;
  projectName: string;
  projectPath: string;
}

export function resolveTarget(
  fs: FsReader,
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

export async function ensureImageReady(
  runtime: Runtime,
  settingsStore: SettingsStore,
  stateStore: StateStore,
  fs: FsReader,
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
