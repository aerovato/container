#!/usr/bin/env node

// eslint-disable-next-line no-restricted-imports
import fs from "fs";
import * as clack from "@clack/prompts";
import { SettingsStore, StateStore } from "./config";
import { Filesystem } from "./platform/fs";
import { SETTINGS_PATH, STATE_PATH } from "./platform/paths";
import { ContainerClient } from "./container-client";
import {
  Executor,
  createExecutor,
  ensureRuntimeReady,
  getDefaultRuntime,
} from "./platform/shell";
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
import pkg from "../package.json";

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

  if (parsed.command === "version") {
    console.log(pkg.version);
    return;
  }

  const fsReader = new Filesystem(fs);
  runMigration(fsReader);
  runSetup(fsReader);
  const settingsStore = new SettingsStore(fsReader, SETTINGS_PATH);
  const stateStore = new StateStore(fsReader, STATE_PATH);

  if (parsed.command === "upgrade") {
    await upgradeCommand(
      executor,
      stateStore,
      process.execPath,
      process.argv[1],
    );
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

  switch (parsed.command) {
    case "settings":
      await settingsCommand(executor, settingsStore, stateStore, fsReader);
      return;
  }

  if (!settings.runtime) {
    clack.log.error(
      "No container runtime found. Install Docker or Podman to continue.",
    );
    process.exit(1);
  }

  if (
    !(await ensureRuntimeReady(executor, settings.runtime, () => {
      clack.log.info(`Starting ${settings.runtime}...`);
    }))
  ) {
    clack.log.error(
      `Unable to start ${settings.runtime}. Start it manually and try again.`,
    );
    process.exit(1);
  }

  const runtime = new ContainerClient(executor, settings.runtime);

  stopOrphanedContainers(runtime);

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
