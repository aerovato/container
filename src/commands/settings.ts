import * as clack from "@clack/prompts";
import { Runtime } from "../runtime";
import { SettingsStore, StateStore, FsReader } from "../config";
import { RuntimeBin } from "../types";
import { HARNESS_PACKS } from "../harness-packs";
import { buildImage } from "../docker";
import { BuildTarget } from "../types";

type SettingsAction = "harnesses" | "runtime" | "mounts" | "done";

function formatList(items: string[]): string {
  return items.length > 0 ? items.join(", ") : "none";
}

export async function settingsCommand(
  runtime: Runtime,
  settingsStore: SettingsStore,
  stateStore: StateStore,
  fs: FsReader,
): Promise<void> {
  const result = settingsStore.load();
  if (!result.ok) {
    clack.log.error("Failed to load settings");
    process.exit(1);
  }

  let settings = result.value;
  const initialHarnesses = [...(settings.enabledHarnesses ?? [])];

  clack.intro("Settings");

  while (true) {
    const action = await clack.select<SettingsAction>({
      message: "What would you like to configure?",
      options: [
        {
          value: "harnesses",
          label: "Enabled Harnesses",
        },
        {
          value: "runtime",
          label: "Container Runtime",
          hint: settings.runtime ?? "not set",
        },
        {
          value: "mounts",
          label: "System Mounts",
          hint: `SSH: ${(settings.systemMounts?.ssh ?? false) ? "on" : "off"}, Gitconfig: ${(settings.systemMounts?.gitconfig ?? true) ? "on" : "off"}`,
        },
        { value: "done", label: "Done" },
      ],
    });

    if (clack.isCancel(action) || action === "done") break;

    switch (action) {
      case "harnesses": {
        const allIds = Object.keys(HARNESS_PACKS);
        const selected = await clack.multiselect({
          message:
            "Select harnesses to enable (space to toggle, enter to confirm)",
          options: allIds.map(id => {
            const pack = HARNESS_PACKS[id as keyof typeof HARNESS_PACKS];
            return { value: id, label: pack.name };
          }),
          initialValues: settings.enabledHarnesses ?? [],
        });

        if (!clack.isCancel(selected)) {
          const newHarnesses = (selected as string[]).sort();
          settings = {
            ...settings,
            enabledHarnesses: newHarnesses,
          };
          settingsStore.save(settings);
          clack.log.success(`Harnesses updated: ${formatList(newHarnesses)}`);
        }
        break;
      }
      case "runtime": {
        const selected = await clack.select({
          message: "Select container runtime",
          options: [
            { value: "docker", label: "Docker" },
            { value: "podman", label: "Podman" },
          ],
          initialValue: settings.runtime,
        });

        if (!clack.isCancel(selected)) {
          settings = { ...settings, runtime: selected as RuntimeBin };
          settingsStore.save(settings);
          clack.log.success(`Runtime updated: ${selected}`);
        }
        break;
      }
      case "mounts": {
        const ssh = await clack.confirm({
          message: "Mount ~/.ssh (read-only)?",
          initialValue: settings.systemMounts?.ssh ?? false,
        });

        if (clack.isCancel(ssh)) break;

        const gitconfig = await clack.confirm({
          message: "Mount ~/.gitconfig (read-only)?",
          initialValue: settings.systemMounts?.gitconfig ?? true,
        });

        if (clack.isCancel(gitconfig)) break;

        settings = {
          ...settings,
          systemMounts: { ssh, gitconfig },
        };
        settingsStore.save(settings);
        clack.log.success(
          `Mounts updated: SSH ${ssh ? "on" : "off"}, Gitconfig ${gitconfig ? "on" : "off"}`,
        );
        break;
      }
    }
  }

  const currentHarnesses = [...(settings.enabledHarnesses ?? [])].sort();
  const initialSorted = [...initialHarnesses].sort();
  const harnessesChanged =
    currentHarnesses.length !== initialSorted.length
    || currentHarnesses.some((v, i) => v !== initialSorted[i]);

  if (harnessesChanged) {
    const rebuildChoice = await clack.select({
      message: "Harness selection changed. Rebuild the image now?",
      options: [
        { value: "full", label: "Full Rebuild (Core → Harness → User)" },
        { value: "harness", label: "Harness Rebuild (Harness → User)" },
        { value: "skip", label: "Skip (will rebuild on next run)" },
      ],
    });

    if (!clack.isCancel(rebuildChoice) && rebuildChoice !== "skip") {
      const target = rebuildChoice as BuildTarget;
      clack.log.info(`Building container image (target: ${target})`);
      const buildResult = buildImage(
        runtime,
        settingsStore,
        stateStore,
        fs,
        target,
      );
      if (!buildResult.ok) {
        clack.log.error("Failed to build image");
        clack.log.warn("Run 'container build' manually to retry.");
      } else {
        clack.log.success("Image built successfully");
      }
    }
  }

  clack.outro("Settings saved");
}
