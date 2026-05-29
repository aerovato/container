import os from "os";
import { Runtime, Executor } from "./runtime";
import { CONFIGS_DIR } from "./config";
import { Settings, Result } from "./types";
import { HARNESS_PACKS } from "./harness-packs";
import { CONTAINER_IMAGE } from "./docker";

export function getMounts(
  projectPath: string,
  projectName: string,
  settings: Settings,
): string[] {
  const home = os.homedir();
  const mounts: string[] = [];

  mounts.push(`${projectPath}:/root/${projectName}`);

  const enabledIds = settings.enabledHarnesses ?? [];
  for (const id of enabledIds) {
    const pack = HARNESS_PACKS[id as keyof typeof HARNESS_PACKS];
    if (!pack) continue;
    for (const c of pack.config) {
      mounts.push(`${CONFIGS_DIR}/${c.config}:${c.mount}`);
    }
  }

  if (settings.systemMounts?.gitconfig !== false) {
    mounts.push(`${home}/.gitconfig:/root/.gitconfig:ro`);
  }

  if (settings.systemMounts?.ssh === true) {
    mounts.push(`${home}/.ssh:/root/.ssh:ro`);
  }

  return mounts;
}

export function createNewContainer(
  runtime: Runtime,
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
  runtime: Runtime,
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

export function getOtherSessionCount(
  executor: Executor,
  containerName: string,
  projectName: string,
): number {
  const result = executor.spawnSync("ps", ["ax", "-o", "command="], {
    encoding: "utf-8",
  });
  if (result.status !== 0) return 0;

  const lines = result.stdout.toString().split("\n");
  let count = 0;

  for (const line of lines) {
    const hasExec = line.includes(" exec ");
    const hasIt = line.includes("-it");
    const hasContainerName = line.includes(containerName);
    const hasBash = line.includes("/bin/bash");
    const hasWorkdir = line.includes(`-w /root/${projectName}`);

    if (hasExec && hasIt && hasContainerName && hasBash && hasWorkdir) {
      count++;
    }
  }

  return count;
}

export function stopContainerIfLastSession(
  executor: Executor,
  runtime: Runtime,
  containerName: string,
  projectName: string,
): void {
  const otherSessions = getOtherSessionCount(
    executor,
    containerName,
    projectName,
  );
  if (otherSessions === 0) {
    runtime.stop(containerName);
  }
}
