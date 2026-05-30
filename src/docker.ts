import path from "path";
import crypto from "crypto";
import * as clack from "@clack/prompts";
import { Runtime } from "./runtime";
import { FsReader } from "./config";
import {
  SettingsStore,
  StateStore,
  TEMP_DIR,
  APPDATA_DIR,
  USER_DOCKERFILE_PATH,
} from "./config";
import {
  CORE_IMAGE,
  HARNESS_IMAGE,
  USER_IMAGE,
  resolveCoreConfig,
  generateDockerfileCore,
} from "./dockerfile-core";
import { generateDockerfileHarness } from "./dockerfile-harness";
import { Result, BuildTarget } from "./types";

export const CONTAINER_PREFIX = "container";
export const IMAGE_TAG = "latest";
export const CONTAINER_IMAGE = `${USER_IMAGE}:${IMAGE_TAG}`;

export const CORE_DOCKERFILE_PATH = path.join(TEMP_DIR, "Dockerfile.Core");
export const HARNESS_DOCKERFILE_PATH = path.join(
  TEMP_DIR,
  "Dockerfile.Harness",
);

export function generateContainerName(projectPath: string): string {
  const normalizedPath = projectPath.replace(/\/$/, "");
  const projectName = path.basename(normalizedPath);
  const pathHash = crypto
    .createHash("sha1")
    .update(normalizedPath)
    .digest("hex")
    .substring(0, 8);
  return `${CONTAINER_PREFIX}-${projectName}-${pathHash}`;
}

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

  if (target === "full") {
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

  if (target === "full" || target === "harness") {
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
  runtime.pruneImages(`reference=localhost/aerovato/container-v3-*`);

  return { ok: true, value: undefined };
}

function clearBuildDirty(stateStore: StateStore, target: BuildTarget): void {
  const stateResult = stateStore.load();
  if (!stateResult.ok) return;
  const state = stateResult.value;

  if (target === "full") {
    const updated = { ...state };
    delete updated.buildDirty;
    stateStore.save(updated);
    return;
  }

  if (target === "harness" && state.buildDirty === "harness") {
    const updated = { ...state };
    delete updated.buildDirty;
    stateStore.save(updated);
  }
}
