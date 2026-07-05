import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import os from "os";
import { fs, vol } from "memfs";
import { CONFIGS_DIR, SETTINGS_PATH, STATE_PATH } from "../src/platform/paths";
import { FsReader, Filesystem } from "../src/platform/fs";
import { SettingsStore, StateStore } from "../src/config";
import { Platform } from "../src/platform/os";
import { withPlatform } from "./platform/helpers";
import * as clack from "@clack/prompts";
import {
  needsOnboarding,
  LATEST_ONBOARDING_VERSION,
  detectTools,
  migrateToolConfigs,
  expressSetup,
  promptToInstallRuntime,
} from "../src/onboarding";
import { HARNESS_PACKS } from "../src/harness-packs";
import { Executor } from "../src/platform/shell";
import { Settings } from "../src/types";

vi.mock("fs");

const fsReader = new Filesystem(fs as unknown as FsReader);

beforeEach(() => {
  vol.reset();
  vi.clearAllMocks();
});

describe("needsOnboarding", () => {
  it("returns first-time when onboardingVersion is undefined", () => {
    expect(needsOnboarding({})).toBe("first-time");
  });

  it("returns upgrade when onboardingVersion is less than latest", () => {
    expect(needsOnboarding({ onboardingVersion: 1 })).toBe("upgrade");
    expect(needsOnboarding({ onboardingVersion: 3 })).toBe("upgrade");
  });

  it("returns undefined when onboardingVersion equals latest", () => {
    expect(
      needsOnboarding({ onboardingVersion: LATEST_ONBOARDING_VERSION }),
    ).toBe(undefined);
  });

  it("returns undefined when onboardingVersion exceeds latest", () => {
    expect(needsOnboarding({ onboardingVersion: 99 })).toBe(undefined);
  });
});

describe("detectHarnesses (via runtime)", () => {
  const calls: Array<{ command: string; args: string[]; options?: object }> =
    [];
  const queue: Array<{
    status: number | null;
    stdout: string | Buffer;
    stderr: string | Buffer;
  }> = [];

  const mockExecutor: Executor = {
    spawnSync(command: string, args: string[], options?: object) {
      calls.push({ command, args, options });
      if (queue.length > 0) return queue.shift()!;
      return { status: 0, stdout: "", stderr: "" };
    },
  };

  beforeEach(() => {
    calls.length = 0;
    queue.length = 0;
  });

  it("detects harnesses returning exit code 0", () => {
    const ids = Object.keys(HARNESS_PACKS);

    for (let i = 0; i < ids.length; i++) {
      queue.push({ status: i === 0 ? 0 : 1, stdout: "", stderr: "" });
    }

    const detected: string[] = [];
    for (const [id, pack] of Object.entries(HARNESS_PACKS)) {
      if (pack.shouldEnable(mockExecutor)) detected.push(id);
    }

    expect(detected).toEqual([ids[0]]);
    expect(calls).toHaveLength(ids.length);
  });

  it("detects no harnesses when all fail", () => {
    for (let i = 0; i < Object.keys(HARNESS_PACKS).length; i++) {
      queue.push({ status: 1, stdout: "", stderr: "" });
    }

    const detected: string[] = [];
    for (const [, pack] of Object.entries(HARNESS_PACKS)) {
      if (pack.shouldEnable(mockExecutor)) detected.push("x");
    }

    expect(detected).toEqual([]);
  });
});

describe("migrateHarnessConfigs (via fs)", () => {
  const home = os.homedir();

  it("copies harness config from host to configs dir", () => {
    fs.mkdirSync(path.join(home, ".claude"), { recursive: true });
    fs.writeFileSync(path.join(home, ".claude", "settings.json"), '{"k":"v"}');
    fs.mkdirSync(CONFIGS_DIR, { recursive: true });

    const sourcePath = path.join(home, ".claude");
    const destPath = path.join(CONFIGS_DIR, ".claude");

    if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true, mode: 0o700 });
      fs.cpSync(sourcePath, destPath, { recursive: true });
    }

    expect(
      fs.existsSync(path.join(CONFIGS_DIR, ".claude", "settings.json")),
    ).toBe(true);
  });

  it("skips when dest already exists", () => {
    fs.mkdirSync(path.join(home, ".codex"), { recursive: true });
    fs.writeFileSync(path.join(home, ".codex", "file.txt"), "data");
    fs.mkdirSync(path.join(CONFIGS_DIR, ".codex"), { recursive: true });
    fs.writeFileSync(path.join(CONFIGS_DIR, ".codex", "existing.txt"), "old");

    const sourcePath = path.join(home, ".codex");
    const destPath = path.join(CONFIGS_DIR, ".codex");

    if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
      fs.cpSync(sourcePath, destPath, { recursive: true });
    }

    expect(
      fs.readFileSync(
        path.join(CONFIGS_DIR, ".codex", "existing.txt"),
        "utf-8",
      ) as string,
    ).toBe("old");
  });

  it("skips when source does not exist", () => {
    fs.mkdirSync(CONFIGS_DIR, { recursive: true });

    const sourcePath = path.join(home, ".nonexistent-harness");
    const destPath = path.join(CONFIGS_DIR, ".nonexistent-harness");

    if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
      fs.cpSync(sourcePath, destPath, { recursive: true });
    }

    expect(fs.existsSync(destPath)).toBe(false);
  });
});

describe("detectTools", () => {
  it("detects always-enabled tools and command-detected tools", () => {
    const mockExecutor: Executor = {
      spawnSync(_command: string, args: string[]) {
        const bin = args[0] ?? "";
        return {
          status: bin === "deno" ? 0 : 1,
          stdout: "",
          stderr: "",
        };
      },
    };
    const detected = detectTools(mockExecutor);
    expect(detected).toEqual([
      "python",
      "bun",
      "enhanced-tools",
      "npm-config",
      "git-config",
      "vim-config",
      "deno",
      "agents-directory",
    ]);
  });
});

describe("migrateToolConfigs", () => {
  it("copies tool config from host to CONFIGS_DIR without overwriting existing files", () => {
    const home = os.homedir();
    fs.mkdirSync(path.join(home, ".bun"), { recursive: true });
    fs.writeFileSync(path.join(home, ".bunfig.toml"), "bun = true");
    fs.mkdirSync(CONFIGS_DIR, { recursive: true });

    // Pre-exist a different config to test non-overwriting
    fs.writeFileSync(path.join(CONFIGS_DIR, ".bunfig.toml"), "existing = true");

    migrateToolConfigs(new Filesystem(fs as unknown as FsReader), ["bun"]);

    // Check that we didn't overwrite the existing config
    const content = fs.readFileSync(
      path.join(CONFIGS_DIR, ".bunfig.toml"),
      "utf-8",
    );
    expect(content).toBe("existing = true");
  });

  it("creates missing tool file and directory configs", () => {
    fs.mkdirSync(CONFIGS_DIR, { recursive: true });

    migrateToolConfigs(fsReader, ["npm-config"]);

    expect(fs.statSync(path.join(CONFIGS_DIR, ".npm")).isDirectory()).toBe(
      true,
    );
    expect(fs.readFileSync(path.join(CONFIGS_DIR, ".npmrc"), "utf-8")).toBe("");
  });
});

describe("promptToInstallRuntime", () => {
  const queue: Array<number | null> = [];
  const executor: Executor = {
    spawnSync() {
      return { status: queue.shift() ?? 1, stdout: "", stderr: "" };
    },
  };

  beforeEach(() => {
    queue.length = 0;
  });

  it("does not prompt when docker is available", async () => {
    queue.push(0, 1);
    await promptToInstallRuntime(executor);
    expect(clack.note).not.toHaveBeenCalled();
    expect(clack.select).not.toHaveBeenCalled();
  });

  it("does not prompt when podman is available", async () => {
    queue.push(1, 0);
    await promptToInstallRuntime(executor);
    expect(clack.note).not.toHaveBeenCalled();
    expect(clack.select).not.toHaveBeenCalled();
  });

  it("shows Podman instructions on Linux and skips", async () => {
    queue.push(1, 1);
    vi.mocked(clack.select).mockResolvedValueOnce("skip");
    await withPlatform(Platform.Linux, () => promptToInstallRuntime(executor));
    expect(clack.note).toHaveBeenCalledWith(
      expect.stringContaining("https://podman.io/docs/installation"),
      expect.any(String),
      expect.anything(),
    );
    expect(clack.select).toHaveBeenCalledTimes(1);
    expect(clack.log.warn).toHaveBeenCalled();
  });

  it("shows Docker Desktop instructions on Windows", async () => {
    queue.push(1, 1);
    vi.mocked(clack.select).mockResolvedValueOnce("skip");
    await withPlatform(Platform.Windows, () =>
      promptToInstallRuntime(executor),
    );
    expect(clack.note).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://docs.docker.com/get-started/get-docker/",
      ),
      expect.any(String),
      expect.anything(),
    );
  });

  it("shows Docker Desktop instructions on macOS", async () => {
    queue.push(1, 1);
    vi.mocked(clack.select).mockResolvedValueOnce("skip");
    await withPlatform(Platform.Macos, () => promptToInstallRuntime(executor));
    expect(clack.note).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://docs.docker.com/get-started/get-docker/",
      ),
      expect.any(String),
      expect.anything(),
    );
  });

  it("proceeds when runtime becomes available after continue", async () => {
    queue.push(1, 1, 0, 1);
    vi.mocked(clack.select).mockResolvedValueOnce("continue");
    await promptToInstallRuntime(executor);
    expect(clack.log.success).toHaveBeenCalled();
    expect(clack.select).toHaveBeenCalledTimes(1);
  });

  it("re-loops on failed recheck then skips", async () => {
    queue.push(1, 1, 1, 1);
    vi.mocked(clack.select)
      .mockResolvedValueOnce("continue")
      .mockResolvedValueOnce("skip");
    await promptToInstallRuntime(executor);
    expect(clack.log.error).toHaveBeenCalled();
    expect(clack.log.warn).toHaveBeenCalled();
    expect(clack.select).toHaveBeenCalledTimes(2);
  });

  it("exits on cancel", async () => {
    queue.push(1, 1);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    vi.mocked(clack.select).mockResolvedValueOnce(Symbol("cancel"));
    vi.mocked(clack.isCancel).mockReturnValueOnce(true);
    await expect(promptToInstallRuntime(executor)).rejects.toThrow(
      "process.exit",
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });
});

describe("expressSetup", () => {
  function makeStores(): {
    settingsStore: SettingsStore;
    stateStore: StateStore;
  } {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    return {
      settingsStore: new SettingsStore(fsReader, SETTINGS_PATH),
      stateStore: new StateStore(fsReader, STATE_PATH),
    };
  }

  it("enables default harnesses when none detected", async () => {
    const executor: Executor = {
      spawnSync: () => ({ status: 1, stdout: "", stderr: "" }),
    };
    const { settingsStore, stateStore } = makeStores();

    const result = await expressSetup(
      new Filesystem(fs as unknown as FsReader),
      executor,
      {} as Settings,
      settingsStore,
      stateStore,
    );

    expect(result.settings.enabledHarnesses).toEqual([
      "opencode",
      "codex",
      "claude",
    ]);
    expect(result.settings.runtime).toBeUndefined();
    expect(result.state.buildDirty).toBe("harness");
  });

  it("uses detected harnesses instead of defaults", async () => {
    const executor: Executor = {
      spawnSync: (_bin: string, args: string[]) => ({
        status: (args[0] ?? "") === "claude" ? 0 : 1,
        stdout: "",
        stderr: "",
      }),
    };
    const { settingsStore, stateStore } = makeStores();

    const result = await expressSetup(
      new Filesystem(fs as unknown as FsReader),
      executor,
      {} as Settings,
      settingsStore,
      stateStore,
    );

    expect(result.settings.enabledHarnesses).toEqual(["opencode", "claude"]);
  });
});
