import { ContainerClient } from "./container-client";
import { CONFIGS_DIR, homeDir, buildBindMount } from "./platform/paths";
import { Settings, Result } from "./types";
import { HARNESS_PACKS } from "./harness-packs";
import { TOOL_PACKS } from "./tool-packs";
import { CONTAINER_IMAGE } from "./docker";

export function getMounts(
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
      mounts.push(buildBindMount(`${CONFIGS_DIR}/${c.config}`, c.mount));
    }
  }

  const enabledToolIds = settings.enabledTools ?? [];
  for (const id of enabledToolIds) {
    const pack = TOOL_PACKS[id as keyof typeof TOOL_PACKS];
    if (!pack) continue;
    for (const c of pack.config) {
      mounts.push(buildBindMount(`${CONFIGS_DIR}/${c.config}`, c.mount));
    }
  }

  if (settings.systemMounts?.ssh === true) {
    mounts.push(buildBindMount(`${home}/.ssh`, "/root/.ssh", "ro"));
  }

  return mounts;
}

export function createNewContainer(
  runtime: ContainerClient,
  containerName: string,
  projectName: string,
  projectPath: string,
  settings: Settings,
  cliFlags: string[],
): Result<void> {
  const mounts = getMounts(projectPath, projectName, settings);
  const args = ["-d", "--name", containerName];

  args.push("-e", "TERM=xterm-256color");
  args.push("-e", "COLORTERM=truecolor");
  args.push("-w", `/root/${projectName}`);

  for (const mount of mounts) {
    args.push("-v", mount);
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
