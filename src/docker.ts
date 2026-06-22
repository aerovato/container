import * as clack from "@clack/prompts";
import { Runtime } from "./runtime";
import { FsReader, SettingsStore, StateStore } from "./config";
import {
  APPDATA_DIR,
  USER_DOCKERFILE_PATH,
  CORE_DOCKERFILE_PATH,
  TOOLS_DOCKERFILE_PATH,
  HARNESS_DOCKERFILE_PATH,
} from "./platform/paths";
import {
  CORE_IMAGE,
  TOOLS_IMAGE,
  HARNESS_IMAGE,
  USER_IMAGE,
  resolveCoreConfig,
  generateDockerfileCore,
} from "./dockerfile-core";
import { generateDockerfileTools } from "./dockerfile-tools";
import { generateDockerfileHarness } from "./dockerfile-harness";
import { Result, BuildTarget } from "./types";

const BUILD_ORDER: BuildTarget[] = ["full", "tools", "harness", "user"];
function shouldBuild(target: BuildTarget, stage: BuildTarget): boolean {
  return BUILD_ORDER.indexOf(target) <= BUILD_ORDER.indexOf(stage);
}

export const IMAGE_TAG = "latest";
export const CONTAINER_IMAGE = `${USER_IMAGE}:${IMAGE_TAG}`;

export function buildImage(
  runtime: Runtime,
  settingsStore: SettingsStore,
  stateStore: StateStore,
  fs: FsReader,
  target: BuildTarget,
): Result<void> {
  const settingsResult = settingsStore.load();
  if (!settingsResult.ok) return settingsResult;
  const settings = settingsResult.value;

  if (shouldBuild(target, "full")) {
    const coreContent = generateDockerfileCore(
      resolveCoreConfig(settings.dockerfileCore ?? {}),
    );
    fs.writeFileSync(CORE_DOCKERFILE_PATH, coreContent);
    clack.log.info(`Building: ${CORE_IMAGE}`);
    const coreResult = runtime.build(
      CORE_DOCKERFILE_PATH,
      `${CORE_IMAGE}:${IMAGE_TAG}`,
      APPDATA_DIR,
    );
    if (!coreResult.ok) return coreResult;
  }

  if (shouldBuild(target, "tools")) {
    const enabledToolIds = settings.enabledTools ?? [];
    const toolsContent = generateDockerfileTools(enabledToolIds);
    fs.writeFileSync(TOOLS_DOCKERFILE_PATH, toolsContent);
    clack.log.info(`Building: ${TOOLS_IMAGE}`);
    const toolsResult = runtime.build(
      TOOLS_DOCKERFILE_PATH,
      `${TOOLS_IMAGE}:${IMAGE_TAG}`,
      APPDATA_DIR,
    );
    if (!toolsResult.ok) return toolsResult;
  }

  if (shouldBuild(target, "harness")) {
    const enabledIds = settings.enabledHarnesses ?? [];
    const harnessContent = generateDockerfileHarness(enabledIds);
    fs.writeFileSync(HARNESS_DOCKERFILE_PATH, harnessContent);
    clack.log.info(`Building: ${HARNESS_IMAGE}`);
    const harnessResult = runtime.build(
      HARNESS_DOCKERFILE_PATH,
      `${HARNESS_IMAGE}:${IMAGE_TAG}`,
      APPDATA_DIR,
    );
    if (!harnessResult.ok) return harnessResult;
  }

  clack.log.info(`Building: ${USER_IMAGE}`);
  const userResult = runtime.build(
    USER_DOCKERFILE_PATH,
    `${USER_IMAGE}:${IMAGE_TAG}`,
    APPDATA_DIR,
  );
  if (!userResult.ok) return userResult;

  clearBuildDirty(stateStore, target);
  runtime.pruneImages(`label=aerovato.container=v3`);

  return { ok: true, value: undefined };
}

function clearBuildDirty(stateStore: StateStore, target: BuildTarget): void {
  const stateResult = stateStore.load();
  if (!stateResult.ok) return;
  const state = stateResult.value;
  if (state.buildDirty === undefined) return;

  const targetIdx = BUILD_ORDER.indexOf(target);
  const dirtyIdx = BUILD_ORDER.indexOf(state.buildDirty);
  if (targetIdx === -1 || dirtyIdx === -1) {
    return;
  }

  if (targetIdx <= dirtyIdx) {
    const updated = { ...state };
    delete updated.buildDirty;
    stateStore.save(updated);
  }
}
