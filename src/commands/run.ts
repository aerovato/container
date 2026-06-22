import * as clack from "@clack/prompts";
import { Runtime } from "../runtime";
import { Executor } from "../platform/shell";
import { SettingsStore, StateStore } from "../config";
import { Filesystem } from "../platform/fs";
import { resolveTarget, ensureImageReady } from "./shared";
import { createContainer } from "./create";
import { attachToContainer } from "./attach";
import pkg from "../../package.json";
import { maybeCheckForUpdate } from "../update-check";

export async function runCommand(
  runtime: Runtime,
  executor: Executor,
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
    attachToContainer(runtime, executor, settings, resolved, []);
  } else {
    attachToContainer(runtime, executor, settings, resolved, cliFlags);
  }

  if (updateInfo) {
    clack.log.info(
      `An update is available for \`container\`: ${updateInfo.current} → ${updateInfo.latest}`,
    );
    clack.log.info("Run `npm install -g @aerovato/container` to update");
  }
}
