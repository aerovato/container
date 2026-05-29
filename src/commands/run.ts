import path from "path";
import { printInfo, printSuccess, printWarning, printError } from "../utils";
import clack from "@clack/prompts";
import { Runtime, Executor } from "../runtime";
import { SettingsStore, StateStore, FsReader } from "../config";
import { generateContainerName, buildImage, CONTAINER_IMAGE } from "../docker";
import { resolveProjectPath, getBuildDirty } from "./shared";
import {
  createNewContainer,
  execInteractive,
  stopContainerIfLastSession,
} from "../container";

interface ResolvedTarget {
  containerName: string;
  projectName: string;
  projectPath: string;
}

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
    printError("Failed to load settings");
    process.exit(1);
  }
  const settings = settingsResult.value;

  const resolved = resolveTarget(fs, target);
  if (!resolved) process.exit(1);
  const { containerName, projectName, projectPath } = resolved;

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
        printError("Failed to build image");
        process.exit(1);
      }
      printSuccess("Image built successfully");
    } else {
      printWarning(
        `Continuing with existing image. Run 'container build ${buildTarget}' to rebuild.`,
      );
    }
  }

  if (!runtime.imageExists(CONTAINER_IMAGE)) {
    printWarning("Image not found. Building...");
    const result = buildImage(runtime, settingsStore, stateStore, fs, "full");
    if (!result.ok) {
      printError("Failed to build image");
      process.exit(1);
    }
    printSuccess("Image built successfully");
  }

  if (!runtime.containerExists(containerName)) {
    printInfo(`Creating new container: ${containerName}`);
    printInfo(`Project: ${projectPath}`);

    const result = createNewContainer(
      runtime,
      containerName,
      projectName,
      projectPath,
      settings,
      cliFlags,
    );
    if (!result.ok) {
      printError("Failed to create container");
      process.exit(1);
    }
  }

  if (!runtime.containerRunning(containerName)) {
    printInfo(`Starting container: ${containerName}`);
    runtime.start(containerName);
  }

  printInfo("Attaching to container...");
  execInteractive(runtime, containerName, projectName, settings, cliFlags);
  stopContainerIfLastSession(executor, runtime, containerName, projectName);
  printSuccess("Container session ended");
}

function resolveTarget(
  fs: FsReader,
  target: string | undefined,
): ResolvedTarget | null {
  const projectPath = resolveProjectPath(target);
  if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
    printError(`Project directory does not exist: ${projectPath}`);
    return null;
  }
  const containerName = generateContainerName(projectPath);
  const projectName = path.basename(projectPath);
  return { containerName, projectName, projectPath };
}
