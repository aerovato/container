import * as clack from "@clack/prompts";
import { ContainerClient } from "../container-client";
import { SettingsStore, StateStore } from "../config";
import { Filesystem } from "../platform/fs";
import { resolveTarget, ensureImageReady, ResolvedTarget } from "./shared";
import { Settings } from "../types";
import { createNewContainer } from "../container";

export function createContainer(
  runtime: ContainerClient,
  settings: Settings,
  resolved: ResolvedTarget,
  cliFlags: string[],
): void {
  clack.log.info(`Creating new container: ${resolved.containerName}`);
  clack.log.info(`Project: ${resolved.projectPath}`);

  const result = createNewContainer(
    runtime,
    resolved.containerName,
    resolved.projectName,
    resolved.projectPath,
    settings,
    cliFlags,
  );
  if (!result.ok) {
    clack.log.error("Failed to create container");
    process.exit(1);
  }
}

export async function createCommand(
  runtime: ContainerClient,
  settingsStore: SettingsStore,
  stateStore: StateStore,
  fs: Filesystem,
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

  await ensureImageReady(runtime, settingsStore, stateStore, fs);

  if (runtime.containerExists(resolved.containerName)) {
    clack.log.error(`Container already exists: ${resolved.containerName}`);
    process.exit(1);
  }

  createContainer(runtime, settings, resolved, cliFlags);
  clack.log.success(`Container created: ${resolved.containerName}`);
}
