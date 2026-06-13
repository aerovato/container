import os from "os";
import path from "path";
import * as clack from "@clack/prompts";
import { FsReader, CONFIGS_DIR, SettingsStore, StateStore } from "./config";
import { Settings, StateData, RuntimeBin } from "./types";
import { HARNESS_PACKS } from "./harness-packs";
import { TOOL_PACKS } from "./tool-packs";
import { buildImage } from "./docker";
import { Executor, Runtime } from "./runtime";
import { getDefaultRuntime, getRuntimeAvailability } from "./commands/shared";

export const LATEST_ONBOARDING_VERSION = 4;

export type OnboardingReason = "first-time" | "manual" | "upgrade";

export function needsOnboarding(
  settings: Settings,
): OnboardingReason | undefined {
  const version = settings.onboardingVersion;
  if (version === undefined) return "first-time";
  if (version < LATEST_ONBOARDING_VERSION) return "upgrade";
  return undefined;
}

export async function runOnboarding(
  fs: FsReader,
  executor: Executor,
  settings: Settings,
  settingsStore: SettingsStore,
  stateStore: StateStore,
  reason: OnboardingReason,
): Promise<{ settings: Settings; state: StateData }> {
  clack.intro("Onboarding");

  if (reason === "upgrade") {
    clack.note(
      "Re-onboarding triggered by a new feature update.",
      "Onboarding",
      { format: line => line },
    );
  }

  const mode = await clack.select({
    message: "Choose setup mode",
    options: [
      {
        value: "express",
        label: "Express Setup (Auto-detect and configure)",
      },
      { value: "custom", label: "Custom Setup (Manual step-by-step setup)" },
    ],
  });

  if (clack.isCancel(mode)) {
    clack.cancel("Onboarding cancelled");
    process.exit(0);
  }

  const result =
    mode === "express"
      ? await expressSetup(fs, executor, settings, settingsStore, stateStore)
      : await customSetup(fs, executor, settings, settingsStore, stateStore);

  result.settings.onboardingVersion = LATEST_ONBOARDING_VERSION;
  return result;
}

async function expressSetup(
  fs: FsReader,
  executor: Executor,
  settings: Settings,
  settingsStore: SettingsStore,
  stateStore: StateStore,
): Promise<{ settings: Settings; state: StateData }> {
  const spinner = clack.spinner();

  spinner.start("Detecting installed harnesses");
  const harnessIds = detectHarnesses(executor);
  spinner.stop(
    `Detected ${harnessIds.length} harnesses: ${harnessIds.join(", ") || "none"}`,
  );

  spinner.start("Migrating harness configs");
  const migratedCount = migrateAllConfigs(fs, harnessIds);
  spinner.stop(`Migrated ${migratedCount} config items`);

  spinner.start("Detecting installed tooling");
  const toolIds = detectTools(executor);
  spinner.stop(`Detected ${toolIds.length} tools`);

  spinner.start("Migrating tool configs");
  const toolMigratedCount = migrateAllToolConfigs(fs, toolIds);
  spinner.stop(`Migrated ${toolMigratedCount} tool config items`);

  spinner.start("Detecting container runtime");
  const runtime = getDefaultRuntime(executor);
  spinner.stop(runtime ? `Runtime: ${runtime}` : "No runtime detected");

  const summary = [
    `Enabled Harnesses: ${harnessIds.join(", ") || "none"}`,
    `Enabled Tools: ${toolIds.join(", ") || "none"}`,
    `Migrated Configs: ${migratedCount + toolMigratedCount}`,
    `Runtime: ${runtime || "not detected"}`,
    `SSH Mount: enabled`,
  ].join("\n");

  clack.note(summary, "Configuration Summary", { format: line => line });

  if (runtime) {
    const rt = new Runtime(executor, runtime);
    clack.log.info(`Building container image (target: full)`);
    const buildResult = buildImage(rt, settingsStore, stateStore, fs, "full");
    if (!buildResult.ok) {
      clack.log.error("Failed to build image");
      clack.log.warn("Run 'container build' manually to retry.");
    } else {
      clack.log.success("Image built successfully");
    }
  }

  return {
    settings: {
      ...settings,
      enabledHarnesses: harnessIds,
      enabledTools: toolIds,
      runtime,
      systemMounts: { ssh: true },
    },
    state: { buildDirty: "harness" },
  };
}

async function customSetup(
  fs: FsReader,
  executor: Executor,
  settings: Settings,
  settingsStore: SettingsStore,
  stateStore: StateStore,
): Promise<{ settings: Settings; state: StateData }> {
  clack.intro("Custom Setup");

  const harnessIds = await selectHarnessesInteractive(executor, settings);
  if (harnessIds.length > 0) {
    await migrateConfigsInteractive(fs, harnessIds);
  }
  const toolIds = await selectToolsInteractive(executor, settings);
  if (toolIds.length > 0) {
    migrateAllToolConfigs(fs, toolIds);
  }
  const runtime = await selectRuntimeInteractive(executor, settings.runtime);
  const sshMount = await confirmSSHMount(settings);

  clack.note("Onboarding complete.", "Done", { format: line => line });

  if (runtime) {
    const shouldBuild = await clack.confirm({
      message: "Build the container image now? (Recommended)",
    });
    if (!clack.isCancel(shouldBuild) && shouldBuild) {
      const rt = new Runtime(executor, runtime);
      clack.log.info(`Building container image (target: full)`);
      const buildResult = buildImage(rt, settingsStore, stateStore, fs, "full");
      if (!buildResult.ok) {
        clack.log.error("Failed to build image");
        clack.log.warn("Run 'container build' manually to retry.");
      } else {
        clack.log.success("Image built successfully");
      }
    }
  }

  return {
    settings: {
      ...settings,
      enabledHarnesses: harnessIds,
      enabledTools: toolIds,
      runtime,
      systemMounts: { ssh: sshMount },
    },
    state: { buildDirty: "harness" },
  };
}

async function selectToolsInteractive(
  executor: Executor,
  settings: Settings,
): Promise<string[]> {
  const allIds = Object.keys(TOOL_PACKS);
  const currentIds =
    settings.enabledTools === undefined
      ? detectTools(executor)
      : settings.enabledTools;

  const selectedIds = await clack.multiselect({
    message: "Select tools to install (space to select, submit via enter)",
    options: allIds.map(id => {
      const pack = TOOL_PACKS[id as keyof typeof TOOL_PACKS];
      return {
        value: id,
        label: pack.name,
      };
    }),
    initialValues: currentIds,
  });

  if (clack.isCancel(selectedIds)) {
    clack.cancel("Onboarding cancelled");
    process.exit(0);
  }

  return selectedIds as string[];
}

async function selectHarnessesInteractive(
  executor: Executor,
  settings: Settings,
): Promise<string[]> {
  const allIds = Object.keys(HARNESS_PACKS);
  const currentIds =
    settings.enabledHarnesses === undefined
      ? detectHarnesses(executor)
      : settings.enabledHarnesses;

  const selectedIds = await clack.multiselect({
    message: "Select harnesses to install (space to select, submit via enter)",
    options: allIds.map(id => {
      const pack = HARNESS_PACKS[id as keyof typeof HARNESS_PACKS];
      return {
        value: id,
        label: pack.name,
      };
    }),
    initialValues: currentIds,
  });

  if (clack.isCancel(selectedIds)) {
    clack.cancel("Onboarding cancelled");
    process.exit(0);
  }

  return selectedIds as string[];
}

async function migrateConfigsInteractive(
  fs: FsReader,
  harnessIds: string[],
): Promise<void> {
  const options = harnessIds
    .map(id => {
      const pack = HARNESS_PACKS[id as keyof typeof HARNESS_PACKS];
      if (!pack) return null;

      let status = "(Unmigrated)";
      for (const c of pack.config) {
        const destPath = path.join(CONFIGS_DIR, c.config);
        if (fs.existsSync(destPath)) {
          status = "(Migrated)";
          break;
        }
      }

      return { value: id, label: `${pack.name} ${status}` };
    })
    .filter(o => o !== null);

  const selection = await clack.multiselect({
    message: "Select harness configs to migrate",
    options,
    required: false,
  });

  if (clack.isCancel(selection)) {
    clack.cancel("Onboarding cancelled");
    process.exit(0);
  }

  for (const harnessId of selection as string[]) {
    const pack = HARNESS_PACKS[harnessId as keyof typeof HARNESS_PACKS];
    if (!pack) continue;

    for (const c of pack.config) {
      const sourcePath = expandHomePath(c.host);
      const destPath = path.join(CONFIGS_DIR, c.config);

      if (!fs.existsSync(sourcePath)) {
        clack.log.warn(`Source not found: ${sourcePath}`);
        continue;
      }

      if (fs.existsSync(destPath)) {
        clack.log.warn(`Already exists: ${destPath}`);
        continue;
      }

      try {
        const parentDir = path.dirname(destPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
        }
        fs.cpSync(sourcePath, destPath, { recursive: true });
        clack.log.success(`${pack.name}: ${c.config}`);
      } catch {
        clack.log.error(`Failed: ${sourcePath}`);
      }
    }
  }
}

async function confirmSSHMount(settings: Settings): Promise<boolean> {
  const sshMount = await clack.confirm({
    message:
      "Mount ~/.ssh (read-only)? Enables SSH-based git operations inside containers.",
    initialValue: settings.systemMounts?.ssh ?? true,
  });

  if (clack.isCancel(sshMount)) {
    clack.cancel("Onboarding cancelled");
    process.exit(0);
  }

  return sshMount;
}

async function selectRuntimeInteractive(
  executor: Executor,
  previousRuntime?: RuntimeBin,
): Promise<RuntimeBin> {
  const { docker, podman } = getRuntimeAvailability(executor);

  clack.note(
    "Select the container runtime.\nNote: Podman is recommended on Linux for rootless containers.",
    "Runtime Selection",
    { format: line => line },
  );

  const runtime = await clack.select({
    message: "Select container runtime",
    options: [
      {
        value: "docker",
        label: docker ? "Docker" : "Docker (Not Installed)",
      },
      {
        value: "podman",
        label: podman ? "Podman" : "Podman (Not Installed)",
      },
    ],
    initialValue: previousRuntime,
  });

  if (clack.isCancel(runtime)) {
    clack.cancel("Onboarding cancelled");
    process.exit(0);
  }

  const selected = runtime as RuntimeBin;
  clack.log.info(`Selected ${selected} as the default runtime.`);
  if (selected === "docker" && !docker) {
    clack.log.warn(
      "Warning: Docker is not installed yet. Install Docker: https://docs.docker.com/get-docker/",
    );
  }
  if (selected === "podman" && !podman) {
    clack.log.warn(
      "Warning: Podman is not installed yet. Install Podman: https://podman.io/docs/installation",
    );
  }

  return selected;
}

function shouldEnablePack(
  shouldEnable: boolean | string,
  executor: Executor,
): boolean {
  if (typeof shouldEnable === "boolean") return shouldEnable;
  const result = executor.spawnSync(shouldEnable, [], {
    shell: true,
    stdio: "pipe",
  });
  return result.status === 0;
}

function detectHarnesses(executor: Executor): string[] {
  const detected: string[] = [];

  for (const [id, pack] of Object.entries(HARNESS_PACKS)) {
    if (shouldEnablePack(pack.shouldEnable, executor)) {
      detected.push(id);
    }
  }

  return detected;
}

export function detectTools(executor: Executor): string[] {
  const detected: string[] = [];

  for (const [id, pack] of Object.entries(TOOL_PACKS)) {
    if (shouldEnablePack(pack.shouldEnable, executor)) {
      detected.push(id);
    }
  }

  return detected;
}

function migrateAllConfigs(fs: FsReader, harnessIds: string[]): number {
  let count = 0;

  for (const id of harnessIds) {
    const pack = HARNESS_PACKS[id as keyof typeof HARNESS_PACKS];
    if (!pack) continue;

    for (const c of pack.config) {
      const sourcePath = expandHomePath(c.host);
      const destPath = path.join(CONFIGS_DIR, c.config);

      if (!fs.existsSync(sourcePath)) continue;
      if (fs.existsSync(destPath)) continue;

      try {
        const parentDir = path.dirname(destPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
        }
        fs.cpSync(sourcePath, destPath, { recursive: true });
        count++;
      } catch {
        clack.log.error(`Failed to migrate: ${sourcePath}`);
      }
    }
  }

  return count;
}

export function migrateAllToolConfigs(fs: FsReader, toolIds: string[]): number {
  let count = 0;

  for (const id of toolIds) {
    const pack = TOOL_PACKS[id as keyof typeof TOOL_PACKS];
    if (!pack) continue;

    for (const c of pack.config) {
      const sourcePath = expandHomePath(c.host);
      const destPath = path.join(CONFIGS_DIR, c.config);

      if (!fs.existsSync(sourcePath)) continue;
      if (fs.existsSync(destPath)) continue;

      try {
        const parentDir = path.dirname(destPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
        }
        fs.cpSync(sourcePath, destPath, { recursive: true });
        count++;
      } catch {
        clack.log.error(`Failed to migrate: ${sourcePath}`);
      }
    }
  }

  return count;
}

function expandHomePath(hostPath: string): string {
  const home = os.homedir();
  if (hostPath.startsWith("~")) {
    return path.join(home, hostPath.slice(1));
  }
  return hostPath;
}
