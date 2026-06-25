import path from "path";
import * as clack from "@clack/prompts";
import { Executor } from "../platform/shell";
import { isWindows } from "../platform/os";
import { STANDALONE_INSTALL_DIR } from "../platform/paths";

const REPO_URL = "https://github.com/aerovato/container";
const INSTALL_SH_URL = "https://container.aerovato.com/install.sh";
const INSTALL_PS1_URL = "https://container.aerovato.com/install.ps1";

type InstallSource = "standalone" | "npm" | "unknown";

function isPathInside(candidate: string, parent: string): boolean {
  const normalizedCandidate = normalize(path.resolve(candidate));
  const normalizedParent = normalize(path.resolve(parent));
  return (
    normalizedCandidate === normalizedParent
    || normalizedCandidate.startsWith(`${normalizedParent}/`)
  );
}

export function detectInstallSource(
  execPath: string,
  scriptPath: string | undefined,
): InstallSource {
  if (isPathInside(execPath, STANDALONE_INSTALL_DIR)) {
    return "standalone";
  }

  const execName = path.basename(execPath).toLowerCase();
  const normalizedScript = normalize(scriptPath || "");
  const scriptName = path.basename(normalizedScript).toLowerCase();
  const packageSegment = normalize(
    path.join("node_modules", "@aerovato", "container"),
  );
  if (
    (execName === "node" || execName === "node.exe")
    && (normalizedScript.includes(packageSegment)
      || scriptName === "container"
      || scriptName === "container.cmd")
  ) {
    return "npm";
  }

  return "unknown";
}

export function upgradeCommand(
  executor: Executor,
  execPath: string,
  scriptPath: string | undefined,
): void {
  const source = detectInstallSource(execPath, scriptPath);

  if (source === "npm") {
    upgradeNpm(executor);
    return;
  }

  if (source === "standalone") {
    upgradeStandalone(executor);
    return;
  }

  showUnknownInstallPrompt();
}

function showUnknownInstallPrompt(): void {
  clack.log.info("Unable to determine how `container` was installed.");
  clack.log.info(
    `Update manually via original installation method or ${REPO_URL}.`,
  );
}

function upgradeNpm(executor: Executor): void {
  const npm = isWindows() ? "npm.cmd" : "npm";
  const result = executor.spawnSync(
    npm,
    ["install", "-g", "@aerovato/container@latest"],
    {
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    clack.log.error("npm upgrade failed.");
    process.exit(1);
  }
}

function upgradeStandalone(executor: Executor): void {
  const result = isWindows()
    ? executor.spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          `irm ${INSTALL_PS1_URL} | iex`,
        ],
        { stdio: "inherit" },
      )
    : executor.spawnSync(
        "sh",
        [
          "-c",
          `if command -v curl >/dev/null 2>&1; then curl -fsSL ${INSTALL_SH_URL} | sh; elif command -v wget >/dev/null 2>&1; then wget -qO- ${INSTALL_SH_URL} | sh; else printf 'Install requires curl or wget.\\n' >&2; exit 1; fi`,
        ],
        { stdio: "inherit" },
      );

  if (result.status !== 0) {
    clack.log.error("Standalone upgrade failed. Please retry the upgrade.");
    process.exit(1);
  }
}

function normalize(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  return isWindows() ? normalized.toLowerCase() : normalized;
}
