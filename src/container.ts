import { ContainerClient } from "./container-client";
import { Filesystem } from "./platform/fs";
import { homeDir, buildBindMount } from "./platform/paths";
import { Settings, Result } from "./types";
import { HARNESS_PACKS } from "./harness-packs";
import { TOOL_PACKS } from "./tool-packs";
import { CONTAINER_IMAGE } from "./docker";
import { configMountSourcePath, ensureConfigExists } from "./config";

export function getMounts(
  fs: Filesystem,
  projectPath: string,
  projectName: string,
  settings: Settings,
): string[] {
  const home = homeDir();
  const mounts: string[] = [];

  mounts.push(buildBindMount(projectPath, `/root/${projectName}`));

  const enabledIds = settings.enabledHarnesses ?? [];
  for (const id of enabledIds) {
    const pack = HARNESS_PACKS[id as keyof typeof HARNESS_PACKS];
    if (!pack) continue;
    for (const c of pack.config) {
      ensureConfigExists(fs, c);
      mounts.push(buildBindMount(configMountSourcePath(c), c.mount));
    }
  }

  const enabledToolIds = settings.enabledTools ?? [];
  for (const id of enabledToolIds) {
    const pack = TOOL_PACKS[id as keyof typeof TOOL_PACKS];
    if (!pack) continue;
    for (const c of pack.config) {
      ensureConfigExists(fs, c);
      mounts.push(buildBindMount(configMountSourcePath(c), c.mount));
    }
  }

  if (settings.systemMounts?.ssh === true && fs.existsSync(`${home}/.ssh`)) {
    mounts.push(buildBindMount(`${home}/.ssh`, "/root/.ssh", "ro"));
  }

  return mounts;
}

export function createNewContainer(
  fs: Filesystem,
  runtime: ContainerClient,
  containerName: string,
  projectName: string,
  projectPath: string,
  settings: Settings,
  cliFlags: string[],
): Result<void> {
  const mounts = getMounts(fs, projectPath, projectName, settings);
  const args = ["-d", "--name", containerName];

  args.push("-e", "TERM=xterm-256color");
  args.push("-e", "COLORTERM=truecolor");
  args.push("-w", `/root/${projectName}`);

  for (const mount of mounts) {
    args.push("--mount", mount);
  }

  const runFlags = settings.dockerRunFlags ?? [];
  args.push(...runFlags);
  args.push(...cliFlags);

  args.push(CONTAINER_IMAGE, "sleep", "infinity");

  return runtime.run(args);
}

export function execInteractive(
  runtime: ContainerClient,
  containerName: string,
  projectName: string,
  settings: Settings,
  cliFlags: string[],
): void {
  const execFlags = settings.dockerExecFlags ?? [];
  runtime.exec([
    "-it",
    "-e",
    "TERM=xterm-256color",
    "-e",
    "COLORTERM=truecolor",
    "-w",
    `/root/${projectName}`,
    ...execFlags,
    ...cliFlags,
    containerName,
    "/bin/bash",
  ]);
}

export function stopContainerIfLastSession(
  runtime: ContainerClient,
  containerName: string,
): void {
  if (runtime.attachedSessionCount(containerName) === 0) {
    runtime.stop(containerName);
  }
}

const ORPHAN_THRESHOLD_MS = 5 * 60 * 1000;

export function stopOrphanedContainers(runtime: ContainerClient): void {
  const containers = runtime.listRunningManagedContainers();
  const now = Date.now();

  for (const name of containers) {
    const startedAt = runtime.containerStartedAt(name);
    if (startedAt === null) continue;

    const startedMs = new Date(startedAt).getTime();
    if (now - startedMs < ORPHAN_THRESHOLD_MS) continue;

    stopContainerIfLastSession(runtime, name);
  }
}
