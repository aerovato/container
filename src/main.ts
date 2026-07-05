#!/usr/bin/env node

// eslint-disable-next-line no-restricted-imports
import fs from "fs";
import * as clack from "@clack/prompts";
import { SettingsStore, StateStore } from "./config";
import { Filesystem } from "./platform/fs";
import { SETTINGS_PATH, STATE_PATH } from "./platform/paths";
import { ContainerClient } from "./container-client";
import { Executor, createExecutor, getDefaultRuntime } from "./platform/shell";
import { Settings } from "./types";
import { ensureTosAccepted } from "./tos";
import { needsOnboarding, runOnboarding, OnboardingReason } from "./onboarding";
import { parseArgs } from "./args";
import { buildCommand } from "./commands/build";
import { runCommand } from "./commands/run";
import { createCommand } from "./commands/create";
import { attachCommand } from "./commands/attach";
import { stopCommand } from "./commands/stop";
import { removeCommand } from "./commands/remove";
import { listCommand } from "./commands/list";
import { settingsCommand } from "./commands/settings";
import { upgradeCommand } from "./commands/upgrade";
import { stopOrphanedContainers } from "./container";
import { runMigration, runSetup } from "./setup";

const executor: Executor = createExecutor();

function setDefaultSettings(
  exec: Executor,
  settings: Settings,
  settingsStore: SettingsStore,
): Settings {
  let updated = false;
  const result = { ...settings };

  if (!result.runtime) {
    const detected = getDefaultRuntime(exec);
    if (detected) {
      result.runtime = detected;
      updated = true;
    }
  }

  if (updated) {
    settingsStore.save(result);
  }

  return result;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  const fsReader = new Filesystem(fs);
  runMigration(fsReader);
  runSetup(fsReader);
  const settingsStore = new SettingsStore(fsReader, SETTINGS_PATH);
  const stateStore = new StateStore(fsReader, STATE_PATH);

  if (parsed.command === "upgrade") {
    upgradeCommand(executor, stateStore, process.execPath, process.argv[1]);
    return;
  }

  if (!(await ensureTosAccepted(settingsStore))) {
    process.exit(1);
  }

  const settingsResult = settingsStore.load();
  if (!settingsResult.ok) {
    clack.log.error("Failed to load settings");
    process.exit(1);
  }
  let settings = settingsResult.value;

  const onboardingStatus: OnboardingReason | undefined =
    parsed.command === "init" ? "manual" : needsOnboarding(settings);

  if (onboardingStatus !== undefined) {
    const onboardResult = await runOnboarding(
      fsReader,
      executor,
      settings,
      settingsStore,
      stateStore,
      onboardingStatus,
    );
    settings = onboardResult.settings;
    if (parsed.command === "init") return;
  }

  settings = setDefaultSettings(executor, settings, settingsStore);

  if (!settings.runtime) {
    clack.log.error(
      "No container runtime found. Install Docker or Podman to continue.",
    );
    process.exit(1);
  }

  const runtime = new ContainerClient(executor, settings.runtime);

  if (!runtime.daemonRunning()) {
    clack.log.error(
      `${settings.runtime} daemon is not running. Start ${settings.runtime} and try again.`,
    );
    process.exit(1);
  }

  stopOrphanedContainers(runtime);

  switch (parsed.command) {
    case "list":
      listCommand(runtime);
      return;
    case "settings":
      await settingsCommand(runtime, settingsStore, stateStore, fsReader);
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
        settingsStore,
        stateStore,
        fsReader,
        parsed.target,
        parsed.cliFlags,
      );
      return;
    case "create":
      await createCommand(
        runtime,
        settingsStore,
        stateStore,
        fsReader,
        parsed.target,
        parsed.cliFlags,
      );
      return;
    case "attach":
      attachCommand(
        runtime,
        settingsStore,
        fsReader,
        parsed.target,
        parsed.cliFlags,
      );
      return;
  }
}

main();
