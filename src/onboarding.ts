import os from "os";
import path from "path";
import * as clack from "@clack/prompts";
import { FsReader, CONFIGS_DIR, SettingsStore, StateStore } from "./config";
import { Settings, StateData, RuntimeBin } from "./types";
import { HARNESS_PACKS } from "./harness-packs";
import { buildImage } from "./docker";
import { Executor, Runtime } from "./runtime";
import { getDefaultRuntime, getRuntimeAvailability } from "./commands/shared";

export const LATEST_ONBOARDING_VERSION = 3;

export function needsOnboarding(settings: Settings): boolean {
  const version = settings.onboardingVersion;
  return version === undefined || version < LATEST_ONBOARDING_VERSION;
}

export async function runOnboarding(
  fs: FsReader,
  executor: Executor,
  settings: Settings,
  settingsStore: SettingsStore,
  stateStore: StateStore,
): Promise<{ settings: Settings; state: StateData }> {
  clack.intro("Onboarding");

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

  spinner.start("Detecting container runtime");
  const runtime = getDefaultRuntime(executor);
  spinner.stop(runtime ? `Runtime: ${runtime}` : "No runtime detected");

  const summary = [
    `Enabled Harnesses: ${harnessIds.join(", ") || "none"}`,
    `Migrated Configs: ${migratedCount}`,
    `Runtime: ${runtime || "not detected"}`,
    `SSH Mount: enabled`,
    `Gitconfig Mount: enabled`,
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
      runtime,
      systemMounts: { gitconfig: true, ssh: true },
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

  const harnessIds = await selectHarnessesInteractive(settings);
  if (harnessIds.length > 0) {
    await migrateConfigsInteractive(fs, harnessIds);
  }
  const runtime = await selectRuntimeInteractive(executor);
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
      runtime,
      systemMounts: { gitconfig: true, ssh: sshMount },
    },
    state: { buildDirty: "harness" },
  };
}

async function selectHarnessesInteractive(
  settings: Settings,
): Promise<string[]> {
  const allIds = Object.keys(HARNESS_PACKS);
  const currentIds = settings.enabledHarnesses ?? [];

  const selectedIds = await clack.multiselect({
    message: "Select harnesses to install (space to select, submit via enter)",
    options: allIds.map(id => {
      const pack = HARNESS_PACKS[id as keyof typeof HARNESS_PACKS];
      return {
        value: id,
        label: pack.name,
        selected: currentIds.includes(id),
      };
    }),
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

      return { value: `${id} ${status}`, label: pack.name };
    })
    .filter(o => o !== null);

  const selection = await clack.multiselect({
    message: "Select harness configs to migrate",
    options,
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
        value: docker ? "docker" : "docker (Not Installed)",
        label: "Docker",
      },
      {
        value: podman ? "podman" : "podman (Not Installed)",
        label: "Podman",
      },
    ],
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

function detectHarnesses(executor: Executor): string[] {
  const detected: string[] = [];

  for (const [id, pack] of Object.entries(HARNESS_PACKS)) {
    const result = executor.spawnSync(pack.detectCommand, [], {
      shell: true,
      stdio: "pipe",
    });
    if (result.status === 0) {
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

function expandHomePath(hostPath: string): string {
  const home = os.homedir();
  if (hostPath.startsWith("~")) {
    return path.join(home, hostPath.slice(1));
  }
  return hostPath;
}
