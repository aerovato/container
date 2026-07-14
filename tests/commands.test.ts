import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fs, vol } from "memfs";
import { ContainerClient } from "../src/container-client";
import { Executor } from "../src/platform/shell";
import { SettingsStore, StateStore } from "../src/config";
import {
  APPDATA_DIR,
  SETTINGS_PATH,
  STATE_PATH,
  TEMP_DIR,
} from "../src/platform/paths";
import { buildCommand } from "../src/commands/build";
import { stopCommand } from "../src/commands/stop";
import { removeCommand } from "../src/commands/remove";
import { listCommand } from "../src/commands/list";
import { settingsCommand } from "../src/commands/settings";
import { createCommand } from "../src/commands/create";
import { attachCommand } from "../src/commands/attach";
import { runCommand } from "../src/commands/run";
import { detectInstallSource, upgradeCommand } from "../src/commands/upgrade";
import * as clack from "@clack/prompts";
import { getBuildDirty } from "../src/commands/shared";
import { FsReader, Filesystem } from "../src/platform/fs";

const calls: Array<{ command: string; args: string[]; options?: object }> = [];
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

function enqueue(result: {
  status: number | null;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
}) {
  queue.push({ stdout: "", stderr: "", ...result });
}

function reset() {
  calls.length = 0;
  queue.length = 0;
  vi.clearAllMocks();
}

const fsReader = new Filesystem(fs as unknown as FsReader);

function withPlatform<T>(platform: NodeJS.Platform, fn: () => T): T {
  const originalPlatform = process.platform;
  Object.defineProperty(process, "platform", { value: platform });
  const result = fn();
  if (result instanceof Promise) {
    return result.finally(() => {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    }) as T;
  }
  Object.defineProperty(process, "platform", { value: originalPlatform });
  return result;
}

vi.mock("fs");

beforeEach(() => {
  reset();
  vol.reset();
});

describe("buildCommand", () => {
  it("calls buildImage and prints success", () => {
    fs.mkdirSync(APPDATA_DIR, { recursive: true });
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    const runtime = new ContainerClient(mockExecutor, "docker");
    const settingsStore = new SettingsStore(fsReader, SETTINGS_PATH);
    const stateStore = new StateStore(fsReader, STATE_PATH);
    enqueue({ status: 0 });
    enqueue({ status: 0 });
    enqueue({ status: 0 });
    enqueue({ status: 0 });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    buildCommand(runtime, settingsStore, stateStore, fsReader, "full");
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("calls process.exit on build failure", () => {
    fs.mkdirSync(APPDATA_DIR, { recursive: true });
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    const runtime = new ContainerClient(mockExecutor, "docker");
    const settingsStore = new SettingsStore(fsReader, SETTINGS_PATH);
    const stateStore = new StateStore(fsReader, STATE_PATH);
    enqueue({ status: 1 });
    enqueue({ status: 0 });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    expect(() =>
      buildCommand(runtime, settingsStore, stateStore, fsReader, "full"),
    ).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});

describe("upgradeCommand", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects standalone installs under ~/.code-container/bin", () => {
    expect(
      detectInstallSource("/root/.code-container/bin/container", undefined),
    ).toBe("standalone");
  });

  it("detects npm installs from node_modules package path", () => {
    expect(
      detectInstallSource(
        "/usr/bin/node",
        "/usr/lib/node_modules/@aerovato/container/dist/js/main.js",
      ),
    ).toBe("npm");
  });

  it("detects npm installs from global bin shims", () => {
    expect(
      detectInstallSource(
        "/Users/aerovato/.nvm/versions/node/v22.22.1/bin/node",
        "/Users/aerovato/.nvm/versions/node/v22.22.1/bin/container",
      ),
    ).toBe("npm");
  });

  it("runs npm upgrade for npm installs", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v99.0.0" }),
    });
    const stateStore = new StateStore(fsReader, STATE_PATH);
    await upgradeCommand(
      mockExecutor,
      stateStore,
      "/usr/bin/node",
      "/usr/lib/node_modules/@aerovato/container/dist/js/main.js",
    );
    expect(calls[0]).toEqual({
      command: "npm",
      args: ["install", "-g", "@aerovato/container@latest"],
      options: { stdio: "inherit" },
    });
    const saved = stateStore.load();
    if (saved.ok) {
      expect(saved.value.lastUpgradeTime).toBeGreaterThan(Date.now() - 10000);
    }
  });

  it("skips upgrade when already current", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v3.4.6" }),
    });

    await upgradeCommand(
      mockExecutor,
      new StateStore(fsReader, STATE_PATH),
      "/usr/bin/node",
      "/usr/lib/node_modules/@aerovato/container/dist/js/main.js",
    );

    expect(calls).toEqual([]);
    expect(clack.log.info).toHaveBeenCalledWith(
      "container is already up to date (3.4.6).",
    );
  });

  it("skips upgrade when latest version check fails", async () => {
    mockFetch.mockRejectedValue(new Error("network"));
    const stateStore = new StateStore(fsReader, STATE_PATH);

    await upgradeCommand(
      mockExecutor,
      stateStore,
      "/usr/bin/node",
      "/usr/lib/node_modules/@aerovato/container/dist/js/main.js",
    );

    expect(calls).toEqual([]);
    expect(clack.log.error).toHaveBeenCalledWith(
      "Unable to check latest version. Please retry later.",
    );
    const saved = stateStore.load();
    if (saved.ok) {
      expect(saved.value.lastUpgradeTime).toBeUndefined();
    }
  });

  it("runs the shell installer for standalone Unix installs", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v99.0.0" }),
    });
    await withPlatform("linux", () => {
      return upgradeCommand(
        mockExecutor,
        new StateStore(fsReader, STATE_PATH),
        "/root/.code-container/bin/container",
        undefined,
      );
    });

    expect(calls[0]).toEqual({
      command: "sh",
      args: [
        "-c",
        "if command -v curl >/dev/null 2>&1; then curl -fsSL https://container.aerovato.com/install.sh | sh; elif command -v wget >/dev/null 2>&1; then wget -qO- https://container.aerovato.com/install.sh | sh; else printf 'Install requires curl or wget.\\n' >&2; exit 1; fi",
      ],
      options: { stdio: "inherit" },
    });
  });

  it("runs the PowerShell installer for standalone Windows installs", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v99.0.0" }),
    });
    await withPlatform("win32", () => {
      return upgradeCommand(
        mockExecutor,
        new StateStore(fsReader, STATE_PATH),
        "/root/.code-container/bin/container.exe",
        undefined,
      );
    });

    expect(calls[0]).toEqual({
      command: "powershell.exe",
      args: [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "irm https://container.aerovato.com/install.ps1 | iex",
      ],
      options: { stdio: "inherit" },
    });
  });

  it("asks the user to retry when standalone installer fails", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v99.0.0" }),
    });
    enqueue({ status: 1 });

    await expect(
      withPlatform("linux", () =>
        upgradeCommand(
          mockExecutor,
          new StateStore(fsReader, STATE_PATH),
          "/root/.code-container/bin/container",
          undefined,
        ),
      ),
    ).rejects.toThrow("process.exit");
    expect(clack.log.error).toHaveBeenCalledWith(
      "Standalone upgrade failed. Please retry the upgrade.",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    const saved = new StateStore(fsReader, STATE_PATH).load();
    if (saved.ok) {
      expect(saved.value.lastUpgradeTime).toBeUndefined();
    }
    exitSpy.mockRestore();
  });
});

describe("stopCommand", () => {
  it("exits when container does not exist", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 1 });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    expect(() => stopCommand(runtime, undefined)).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it("stops running container", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 0 });
    enqueue({ status: 0, stdout: "true\n" });
    enqueue({ status: 0 });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    stopCommand(runtime, undefined);
    const stopCall = calls.find(c => c.args[0] === "stop");
    expect(stopCall).toBeDefined();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("warns when container is not running", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 0 });
    enqueue({ status: 0, stdout: "false\n" });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    stopCommand(runtime, undefined);
    const stopCall = calls.find(c => c.args[0] === "stop");
    expect(stopCall).toBeUndefined();
    exitSpy.mockRestore();
  });
});

describe("removeCommand", () => {
  it("exits when container does not exist", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 1 });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    expect(() => removeCommand(runtime, undefined)).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it("stops then removes running container", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 0 });
    enqueue({ status: 0, stdout: "true\n" });
    enqueue({ status: 0 });
    enqueue({ status: 0 });

    removeCommand(runtime, undefined);
    const stopCall = calls.find(c => c.args[0] === "stop");
    const rmCall = calls.find(c => c.args[0] === "rm");
    expect(stopCall).toBeDefined();
    expect(rmCall).toBeDefined();
  });

  it("removes non-running container without stopping", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 0 });
    enqueue({ status: 0, stdout: "false\n" });
    enqueue({ status: 0 });

    removeCommand(runtime, undefined);
    const stopCall = calls.find(c => c.args[0] === "stop");
    const rmCall = calls.find(c => c.args[0] === "rm");
    expect(stopCall).toBeUndefined();
    expect(rmCall).toBeDefined();
  });
});

describe("listCommand", () => {
  it("delegates to runtime.listContainers", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 0 });

    listCommand(runtime);
    const listCall = calls.find(c => c.args[0] === "ps");
    expect(listCall).toBeDefined();
  });
});

function setupSessionStores(): {
  settingsStore: SettingsStore;
  stateStore: StateStore;
} {
  fs.mkdirSync(APPDATA_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  fs.mkdirSync("/project", { recursive: true });
  const settingsStore = new SettingsStore(fsReader, SETTINGS_PATH);
  const stateStore = new StateStore(fsReader, STATE_PATH);
  settingsStore.save({
    runtime: "docker",
    enabledHarnesses: [],
    systemMounts: { ssh: false },
  });
  return { settingsStore, stateStore };
}

describe("createCommand", () => {
  it("creates container when it does not exist", async () => {
    const { settingsStore, stateStore } = setupSessionStores();
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 0 });
    enqueue({ status: 1 });
    enqueue({ status: 0 });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    await createCommand(
      runtime,
      settingsStore,
      stateStore,
      fsReader,
      "/project",
      ["-p", "8080:8080"],
    );
    const runCalls = calls.filter(c => c.args[0] === "run");
    expect(runCalls).toHaveLength(1);
    expect(runCalls[0].args).toContain("-p");
    expect(runCalls[0].args).toContain("8080:8080");
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("errors if container already exists", async () => {
    const { settingsStore, stateStore } = setupSessionStores();
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 0 });
    enqueue({ status: 0 });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    await expect(
      createCommand(
        runtime,
        settingsStore,
        stateStore,
        fsReader,
        "/project",
        [],
      ),
    ).rejects.toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});

describe("attachCommand", () => {
  it("errors if container does not exist", () => {
    const { settingsStore } = setupSessionStores();
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 1 });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    expect(() =>
      attachCommand(runtime, settingsStore, fsReader, "/project", []),
    ).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it("starts if stopped then execs", () => {
    const { settingsStore } = setupSessionStores();
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 0 });
    enqueue({ status: 0, stdout: "false\n" });
    enqueue({ status: 0 });

    attachCommand(runtime, settingsStore, fsReader, "/project", [
      "-e",
      "FOO=bar",
    ]);
    const startCalls = calls.filter(c => c.args[0] === "start");
    const execCalls = calls.filter(c => c.args[0] === "exec");
    expect(startCalls).toHaveLength(1);
    expect(execCalls).toHaveLength(1);
    expect(execCalls[0].args).toContain("FOO=bar");
  });
});

describe("runCommand flag routing", () => {
  it("on create: routes cliFlags to docker run, not exec", async () => {
    const { settingsStore, stateStore } = setupSessionStores();
    stateStore.save({ lastUpgradeTime: Date.now() });
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 0 });
    enqueue({ status: 1 });
    enqueue({ status: 0 });
    enqueue({ status: 0 });
    enqueue({ status: 0, stdout: "true\n" });
    enqueue({ status: 0 });

    await runCommand(runtime, settingsStore, stateStore, fsReader, "/project", [
      "-p",
      "8080:8080",
    ]);
    const runCalls = calls.filter(c => c.args[0] === "run");
    const execCalls = calls.filter(c => c.args[0] === "exec");
    expect(runCalls).toHaveLength(1);
    expect(runCalls[0].args).toContain("-p");
    expect(runCalls[0].args).toContain("8080:8080");
    expect(execCalls).toHaveLength(1);
    expect(execCalls[0].args).not.toContain("-p");
  });

  it("on attach: routes cliFlags to docker exec", async () => {
    const { settingsStore, stateStore } = setupSessionStores();
    stateStore.save({ lastUpgradeTime: Date.now() });
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 0 });
    enqueue({ status: 0 });
    enqueue({ status: 0 });
    enqueue({ status: 0, stdout: "true\n" });
    enqueue({ status: 0 });

    await runCommand(runtime, settingsStore, stateStore, fsReader, "/project", [
      "-e",
      "FOO=bar",
    ]);
    const runCalls = calls.filter(c => c.args[0] === "run");
    const execCalls = calls.filter(c => c.args[0] === "exec");
    expect(runCalls).toHaveLength(0);
    expect(execCalls).toHaveLength(1);
    expect(execCalls[0].args).toContain("FOO=bar");
  });
});

describe("shared helpers", () => {
  describe("getBuildDirty", () => {
    it("returns undefined when no state file", () => {
      const stateStore = new StateStore(fsReader, STATE_PATH);
      expect(getBuildDirty(stateStore)).toBeUndefined();
    });

    it("returns buildDirty value from state", () => {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
      const stateStore = new StateStore(fsReader, STATE_PATH);
      stateStore.save({ buildDirty: "tools" });
      expect(getBuildDirty(stateStore)).toBe("tools");
    });
  });
});

describe("settingsCommand", () => {
  function setupStores(): {
    settingsStore: SettingsStore;
    stateStore: StateStore;
  } {
    fs.mkdirSync(APPDATA_DIR, { recursive: true });
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    const settingsStore = new SettingsStore(fsReader, SETTINGS_PATH);
    const stateStore = new StateStore(fsReader, STATE_PATH);
    settingsStore.save({
      enabledHarnesses: ["opencode"],
      runtime: "docker",
      systemMounts: { ssh: false },
    });
    stateStore.save({});
    return { settingsStore, stateStore };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exits immediately when done is selected without changes", async () => {
    const { settingsStore, stateStore } = setupStores();

    vi.mocked(clack.select).mockResolvedValueOnce("done");

    await settingsCommand(mockExecutor, settingsStore, stateStore, fsReader);

    expect(clack.outro).toHaveBeenCalledWith("Settings saved");
    expect(calls).toHaveLength(0);
    const saved = settingsStore.load();
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.enabledHarnesses).toEqual(["opencode"]);
  });

  it("updates enabledHarnesses and skips rebuild", async () => {
    const { settingsStore, stateStore } = setupStores();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("harnesses")
      .mockResolvedValueOnce("done")
      .mockResolvedValueOnce("skip");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["opencode", "gemini"]);

    await settingsCommand(mockExecutor, settingsStore, stateStore, fsReader);

    const saved = settingsStore.load();
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.enabledHarnesses).toEqual(["gemini", "opencode"]);
  });

  it("triggers harness rebuild when selected", async () => {
    const { settingsStore, stateStore } = setupStores();

    enqueue({ status: 0 });
    enqueue({ status: 0 });

    vi.mocked(clack.select)
      .mockResolvedValueOnce("harnesses")
      .mockResolvedValueOnce("done")
      .mockResolvedValueOnce("harness");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["opencode", "claude"]);

    await settingsCommand(mockExecutor, settingsStore, stateStore, fsReader);

    const buildCalls = calls.filter(c => c.args[0] === "build");
    expect(buildCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("updates runtime", async () => {
    const { settingsStore, stateStore } = setupStores();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("runtime")
      .mockResolvedValueOnce("podman")
      .mockResolvedValueOnce("done");

    await settingsCommand(mockExecutor, settingsStore, stateStore, fsReader);

    const saved = settingsStore.load();
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.runtime).toBe("podman");
  });

  it("updates system mounts", async () => {
    const { settingsStore, stateStore } = setupStores();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("mounts")
      .mockResolvedValueOnce("done");
    vi.mocked(clack.confirm).mockResolvedValueOnce(true);

    await settingsCommand(mockExecutor, settingsStore, stateStore, fsReader);

    const saved = settingsStore.load();
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.systemMounts).toEqual({ ssh: true });
  });

  it("handles cancel on main menu", async () => {
    const { settingsStore, stateStore } = setupStores();

    vi.mocked(clack.select).mockResolvedValueOnce(Symbol("cancel"));
    vi.mocked(clack.isCancel).mockReturnValueOnce(true);

    await settingsCommand(mockExecutor, settingsStore, stateStore, fsReader);

    expect(clack.outro).toHaveBeenCalledWith("Settings saved");
  });

  it("does not offer rebuild when harnesses unchanged", async () => {
    const { settingsStore, stateStore } = setupStores();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("runtime")
      .mockResolvedValueOnce("docker")
      .mockResolvedValueOnce("done");

    await settingsCommand(mockExecutor, settingsStore, stateStore, fsReader);

    const selectCalls = vi.mocked(clack.select).mock.calls;
    const rebuildCall = selectCalls.find(
      c => typeof c[0] === "object" && c[0]?.message?.includes("Rebuild"),
    );
    expect(rebuildCall).toBeUndefined();
  });

  it("updates enabledTools and saves buildDirty: tools when skipped", async () => {
    const { settingsStore, stateStore } = setupStores();

    vi.mocked(clack.select)
      .mockResolvedValueOnce("tools")
      .mockResolvedValueOnce("done")
      .mockResolvedValueOnce("skip");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["bun", "deno"]);

    await settingsCommand(mockExecutor, settingsStore, stateStore, fsReader);

    const saved = settingsStore.load();
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.enabledTools).toEqual(["bun", "deno"]);

    const state = stateStore.load();
    expect(state.ok).toBe(true);
    if (!state.ok) return;
    expect(state.value.buildDirty).toBe("tools");
  });
});
