import * as clack from "@clack/prompts";
import { ContainerClient } from "../container-client";
import { SettingsStore, StateStore } from "../config";
import { Filesystem } from "../platform/fs";
import { resolveTarget, ensureImageReady } from "./shared";
import { createContainer } from "./create";
import { attachToContainer } from "./attach";
import { maybeCheckForUpdate } from "../update-check";
import pkg from "../../package.json";

export async function runCommand(
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

  const updateInfo = await maybeCheckForUpdate(stateStore, pkg.version);

  await ensureImageReady(runtime, settingsStore, stateStore, fs);

  if (!runtime.containerExists(resolved.containerName)) {
    createContainer(runtime, settings, resolved, cliFlags);
    attachToContainer(runtime, settings, resolved, []);
  } else {
    attachToContainer(runtime, settings, resolved, cliFlags);
  }

  if (updateInfo) {
    clack.log.info(
      `An update is available for \`container\`: ${updateInfo.current} → ${updateInfo.latest}`,
    );
    clack.log.info("Run `container upgrade` to update.");
  }
}
