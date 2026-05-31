import path from "path";
import * as clack from "@clack/prompts";
import { Runtime, Executor } from "../runtime";
import { SettingsStore, StateStore, FsReader } from "../config";
import { generateContainerName, buildImage, CONTAINER_IMAGE } from "../docker";
import { resolveProjectPath, getBuildDirty } from "./shared";
import {
  createNewContainer,
  execInteractive,
  stopContainerIfLastSession,
} from "../container";
import pkg from "../../package.json";
import { maybeCheckForUpdate } from "../update-check";

interface ResolvedTarget {
  containerName: string;
  projectName: string;
  projectPath: string;
}

let pendingUpdate: { current: string; latest: string } | null = null;

process.on("beforeExit", () => {
  if (pendingUpdate) {
    clack.log.info(
      `An update is available for \`container\`: ${pendingUpdate.current} → ${pendingUpdate.latest}`,
    );
    clack.log.info("Run `npm install -g @aerovato/container` to update");
  }
});

export async function runCommand(
  runtime: Runtime,
  executor: Executor,
  settingsStore: SettingsStore,
  stateStore: StateStore,
  fs: FsReader,
  target: string | undefined,
  cliFlags: string[] = [],
): Promise<void> {
  const settingsResult = settingsStore.load();
  if (!settingsResult.ok) {
    clack.log.error("Failed to load settings");
    process.exit(1);
  }
  const settings = settingsResult.value;

  const resolved = resolveTarget(fs, target);
  if (!resolved) process.exit(1);
  const { containerName, projectName, projectPath } = resolved;

  maybeCheckForUpdate(stateStore, pkg.version).then(info => {
    pendingUpdate = info;
  });

  const dirty = getBuildDirty(stateStore);
  if (dirty) {
    const buildTarget = dirty === "core" ? "full" : "harness";
    const shouldBuild = await clack.confirm({
      message: `Build is stale. Run 'container build ${buildTarget}' now?`,
      initialValue: false,
    });
    if (clack.isCancel(shouldBuild)) {
      clack.cancel("Run cancelled");
      process.exit(0);
    }
    if (shouldBuild) {
      const result = buildImage(
        runtime,
        settingsStore,
        stateStore,
        fs,
        buildTarget,
      );
      if (!result.ok) {
        clack.log.error("Failed to build image");
        process.exit(1);
      }
      clack.log.success("Image built successfully");
    } else {
      clack.log.warn(
        `Continuing with existing image. Run 'container build ${buildTarget}' to rebuild.`,
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

  if (!runtime.containerExists(containerName)) {
    clack.log.info(`Creating new container: ${containerName}`);
    clack.log.info(`Project: ${projectPath}`);

    const result = createNewContainer(
      runtime,
      containerName,
      projectName,
      projectPath,
      settings,
      cliFlags,
    );
    if (!result.ok) {
      clack.log.error("Failed to create container");
      process.exit(1);
    }
  }

  if (!runtime.containerRunning(containerName)) {
    clack.log.info(`Starting container: ${containerName}`);
    runtime.start(containerName);
  }

  clack.log.info("Attaching to container...");
  execInteractive(runtime, containerName, projectName, settings, cliFlags);
  stopContainerIfLastSession(executor, runtime, containerName, projectName);
  clack.log.success("Container session ended");
}

function resolveTarget(
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
