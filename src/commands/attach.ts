import * as clack from "@clack/prompts";
import { Runtime } from "../runtime";
import { Executor } from "../platform/shell";
import { SettingsStore } from "../config";
import { Filesystem } from "../platform/fs";
import { resolveTarget, ResolvedTarget } from "./shared";
import { Settings } from "../types";
import { execInteractive, stopContainerIfLastSession } from "../container";

export function attachToContainer(
  runtime: Runtime,
  executor: Executor,
  settings: Settings,
  resolved: ResolvedTarget,
  cliFlags: string[],
): void {
  if (!runtime.containerExists(resolved.containerName)) {
    clack.log.error(`Container does not exist: ${resolved.containerName}`);
    process.exit(1);
  }

  if (!runtime.containerRunning(resolved.containerName)) {
    clack.log.info(`Starting container: ${resolved.containerName}`);
    runtime.start(resolved.containerName);
  }

  let stopped = false;

  const cleanup = (): void => {
    if (stopped) return;
    stopped = true;
    stopContainerIfLastSession(executor, runtime, resolved.containerName);
  };

  const signals: NodeJS.Signals[] = ["SIGINT", "SIGHUP", "SIGTERM"];
  for (const sig of signals) {
    process.on(sig, cleanup);
  }

  clack.log.info("Attaching to container...");
  execInteractive(
    runtime,
    resolved.containerName,
    resolved.projectName,
    settings,
    cliFlags,
  );

  for (const sig of signals) {
    process.removeListener(sig, cleanup);
  }
  cleanup();
  clack.log.success("Container session ended");
}

export function attachCommand(
  runtime: Runtime,
  executor: Executor,
  settingsStore: SettingsStore,
  fs: Filesystem,
  target: string | undefined,
  cliFlags: string[] = [],
): void {
  const settingsResult = settingsStore.load();
  if (!settingsResult.ok) {
    clack.log.error("Failed to load settings");
    process.exit(1);
  }
  const settings = settingsResult.value;

  const resolved = resolveTarget(fs, target);
  if (!resolved) process.exit(1);

  attachToContainer(runtime, executor, settings, resolved, cliFlags);
}
