import path from "path";
import os from "os";
import crypto from "crypto";
import { isWindows } from "./os";

export const APPDATA_DIR = path.join(os.homedir(), ".code-container");
export const CONFIGS_DIR = path.join(APPDATA_DIR, "configs");
export const TEMP_DIR = path.join(APPDATA_DIR, "temp");
export const SETTINGS_PATH = path.join(APPDATA_DIR, "settings.json");
export const STATE_PATH = path.join(TEMP_DIR, "state.json");
export const USER_DOCKERFILE_PATH = path.join(APPDATA_DIR, "Dockerfile.User");

export const CORE_DOCKERFILE_PATH = path.join(TEMP_DIR, "Dockerfile.Core");
export const TOOLS_DOCKERFILE_PATH = path.join(TEMP_DIR, "Dockerfile.Tools");
export const HARNESS_DOCKERFILE_PATH = path.join(
  TEMP_DIR,
  "Dockerfile.Harness",
);

export function homeDir(): string {
  return os.homedir();
}

export function expandHomePath(hostPath: string): string {
  if (hostPath.startsWith("~")) {
    return path.join(homeDir(), hostPath.slice(1));
  }
  return hostPath;
}

export function resolveProjectPath(projectPath: string | undefined): string {
  if (!projectPath) {
    return process.cwd();
  }
  return path.resolve(projectPath);
}

export const CONTAINER_PREFIX = "container";

export function generateContainerName(projectPath: string): string {
  const normalizedPath = projectPath.replace(/[\\/]+$/, "");
  const projectName = path.basename(normalizedPath);
  const pathHash = crypto
    .createHash("sha1")
    .update(normalizedPath)
    .digest("hex")
    .substring(0, 8);
  return `${CONTAINER_PREFIX}-${projectName}-${pathHash}`;
}

export function resolveContainerName(target: string | undefined): string {
  return generateContainerName(resolveProjectPath(target));
}

export function buildBindMount(
  source: string,
  dest: string,
  mode?: string,
): string {
  const src = normalizePath(source);
  const dst = normalizePath(dest);
  return mode !== undefined ? `${src}:${dst}:${mode}` : `${src}:${dst}`;
}

function normalizePath(p: string): string {
  return isWindows() ? p.replace(/\\/g, "/") : p;
}
