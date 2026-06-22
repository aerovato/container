import * as clack from "@clack/prompts";
import { Runtime } from "../runtime";
import { SettingsStore, StateStore } from "../config";
import { Filesystem } from "../platform/fs";
import { buildImage } from "../docker";
import { BuildTarget } from "../types";

export function buildCommand(
  runtime: Runtime,
  settingsStore: SettingsStore,
  stateStore: StateStore,
  fs: Filesystem,
  target: BuildTarget,
): void {
  clack.log.info(`Building container image (target: ${target})`);
  const result = buildImage(runtime, settingsStore, stateStore, fs, target);
  if (!result.ok) {
    clack.log.error("Failed to build image");
    process.exit(1);
  }
  clack.log.success("Image built successfully");
}
