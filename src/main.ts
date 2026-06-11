#!/usr/bin/env node

// eslint-disable-next-line no-restricted-imports
import fs from "fs";
// eslint-disable-next-line no-restricted-imports
import { spawnSync } from "child_process";
import * as clack from "@clack/prompts";
import {
  SettingsStore,
  StateStore,
  FsReader,
  SETTINGS_PATH,
  STATE_PATH,
  ensureAppdataDir,
  ensureConfigDir,
  ensureTempDir,
} from "./config";
import { Runtime, Executor } from "./runtime";
import { ensureTosAccepted } from "./tos";
import { needsOnboarding, runOnboarding } from "./onboarding";
import { parseArgs } from "./args";
import { buildCommand } from "./commands/build";
import { runCommand } from "./commands/run";
import { stopCommand } from "./commands/stop";
import { removeCommand } from "./commands/remove";
import { listCommand } from "./commands/list";
import { getDefaultRuntime } from "./commands/shared";
import { stopOrphanedContainers } from "./container";

const executor: Executor = { spawnSync };

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  const fsReader: FsReader = fs;
  ensureAppdataDir(fsReader);
  ensureConfigDir(fsReader);
  ensureTempDir(fsReader);
  const settingsStore = new SettingsStore(fsReader, SETTINGS_PATH);
  const stateStore = new StateStore(fsReader, STATE_PATH);

  if (!(await ensureTosAccepted(settingsStore))) {
    process.exit(1);
  }

  const settingsResult = settingsStore.load();
  if (!settingsResult.ok) {
    clack.log.error("Failed to load settings");
    process.exit(1);
  }
  let settings = settingsResult.value;

  if (parsed.command === "init" || needsOnboarding(settings)) {
    const onboardResult = await runOnboarding(
      fsReader,
      executor,
      settings,
      settingsStore,
      stateStore,
    );
    settings = onboardResult.settings;
    settingsStore.save(settings);
    stateStore.save(onboardResult.state);

    if (parsed.command === "init") return;
  }

  if (!settings.runtime) {
    const detected = getDefaultRuntime(executor);
    if (detected) {
      settings.runtime = detected;
      settingsStore.save(settings);
    }
  }

  if (!settings.runtime) {
    clack.log.error(
      "No container runtime found. Install Docker or Podman to continue.",
    );
    process.exit(1);
  }

  const runtime = new Runtime(executor, settings.runtime);

  if (!runtime.daemonRunning()) {
    clack.log.error(
      `${settings.runtime} daemon is not running. Start ${settings.runtime} and try again.`,
    );
    process.exit(1);
  }

  stopOrphanedContainers(executor, runtime);

  switch (parsed.command) {
    case "list":
      listCommand(runtime);
      return;
    case "build":
      buildCommand(runtime, settingsStore, stateStore, fsReader, parsed.target);
      return;
    case "stop":
      stopCommand(runtime, parsed.target);
      return;
    case "remove":
      removeCommand(runtime, parsed.target);
      return;
    case "run":
      await runCommand(
        runtime,
        executor,
        settingsStore,
        stateStore,
        fsReader,
        parsed.target,
        parsed.cliFlags,
      );
      return;
  }
}

main();
