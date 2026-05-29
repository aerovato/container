import { printInfo, printSuccess, printError } from "../utils";
import { Runtime } from "../runtime";
import { SettingsStore, StateStore, FsReader } from "../config";
import { buildImage } from "../docker";
import { BuildTarget } from "../types";

export function buildCommand(
  runtime: Runtime,
  settingsStore: SettingsStore,
  stateStore: StateStore,
  fs: FsReader,
  target: BuildTarget,
): void {
  printInfo(`Building container image (target: ${target})`);
  const result = buildImage(runtime, settingsStore, stateStore, fs, target);
  if (!result.ok) {
    printError("Failed to build image");
    process.exit(1);
  }
  printSuccess("Image built successfully");
}
