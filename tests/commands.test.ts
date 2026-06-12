import { describe, it, expect, vi, beforeEach } from "vitest";
import { fs, vol } from "memfs";
import { Runtime, Executor } from "../src/runtime";
import {
  SettingsStore,
  StateStore,
  APPDATA_DIR,
  SETTINGS_PATH,
  STATE_PATH,
  TEMP_DIR,
} from "../src/config";
import { buildCommand } from "../src/commands/build";
import { stopCommand } from "../src/commands/stop";
import { removeCommand } from "../src/commands/remove";
import { listCommand } from "../src/commands/list";
import { settingsCommand } from "../src/commands/settings";
import * as clack from "@clack/prompts";
import {
  resolveProjectPath,
  resolveContainerTarget,
  getBuildDirty,
  getDefaultRuntime,
} from "../src/commands/shared";
import { FsReader } from "../src/config";

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
}

const fsReader = fs as unknown as FsReader;

vi.mock("fs");

beforeEach(() => {
  reset();
  vol.reset();
});

describe("buildCommand", () => {
  it("calls buildImage and prints success", () => {
    fs.mkdirSync(APPDATA_DIR, { recursive: true });
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    const runtime = new Runtime(mockExecutor, "docker");
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
    const runtime = new Runtime(mockExecutor, "docker");
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

describe("stopCommand", () => {
  it("exits when container does not exist", () => {
    const runtime = new Runtime(mockExecutor, "docker");
    enqueue({ status: 1 });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    expect(() => stopCommand(runtime, undefined)).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it("stops running container", () => {
    const runtime = new Runtime(mockExecutor, "docker");
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
    const runtime = new Runtime(mockExecutor, "docker");
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
    const runtime = new Runtime(mockExecutor, "docker");
    enqueue({ status: 1 });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    expect(() => removeCommand(runtime, undefined)).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it("stops then removes running container", () => {
    const runtime = new Runtime(mockExecutor, "docker");
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
    const runtime = new Runtime(mockExecutor, "docker");
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
    const runtime = new Runtime(mockExecutor, "docker");
    enqueue({ status: 0 });

    listCommand(runtime);
    const listCall = calls.find(c => c.args[0] === "ps");
    expect(listCall).toBeDefined();
  });
});

describe("shared helpers", () => {
  describe("resolveProjectPath", () => {
    it("returns cwd when input is undefined", () => {
      expect(resolveProjectPath(undefined)).toBe(process.cwd());
    });

    it("resolves a relative path to absolute", () => {
      const result = resolveProjectPath("some/dir");
      expect(result.startsWith("/")).toBe(true);
      expect(result.endsWith("some/dir")).toBe(true);
    });

    it("returns an absolute path unchanged", () => {
      expect(resolveProjectPath("/absolute/path")).toBe("/absolute/path");
    });
  });

  describe("resolveContainerTarget", () => {
    it("generates a container name from path", () => {
      const name = resolveContainerTarget("/home/user/project");
      expect(name).toMatch(/^container-project-[a-f0-9]{8}$/);
    });
  });

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

  describe("getDefaultRuntime", () => {
    it("returns docker when only docker available", () => {
      enqueue({ status: 0 });
      enqueue({ status: 1 });
      expect(getDefaultRuntime(mockExecutor)).toBe("docker");
    });

    it("returns podman when only podman available", () => {
      enqueue({ status: 1 });
      enqueue({ status: 0 });
      expect(getDefaultRuntime(mockExecutor)).toBe("podman");
    });

    it("returns undefined when neither available", () => {
      enqueue({ status: 1 });
      enqueue({ status: 1 });
      expect(getDefaultRuntime(mockExecutor)).toBeUndefined();
    });

    it("returns podman when both on linux", () => {
      const original = process.platform;
      Object.defineProperty(process, "platform", { value: "linux" });
      enqueue({ status: 0 });
      enqueue({ status: 0 });
      expect(getDefaultRuntime(mockExecutor)).toBe("podman");
      Object.defineProperty(process, "platform", { value: original });
    });

    it("returns docker when both on non-linux", () => {
      const original = process.platform;
      Object.defineProperty(process, "platform", { value: "darwin" });
      enqueue({ status: 0 });
      enqueue({ status: 0 });
      expect(getDefaultRuntime(mockExecutor)).toBe("docker");
      Object.defineProperty(process, "platform", { value: original });
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
      systemMounts: { gitconfig: true, ssh: false },
    });
    stateStore.save({});
    return { settingsStore, stateStore };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exits immediately when done is selected without changes", async () => {
    const { settingsStore, stateStore } = setupStores();
    const runtime = new Runtime(mockExecutor, "docker");

    vi.mocked(clack.select).mockResolvedValueOnce("done");

    await settingsCommand(runtime, settingsStore, stateStore, fsReader);

    expect(clack.outro).toHaveBeenCalledWith("Settings saved");
    const saved = settingsStore.load();
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.enabledHarnesses).toEqual(["opencode"]);
  });

  it("updates enabledHarnesses and skips rebuild", async () => {
    const { settingsStore, stateStore } = setupStores();
    const runtime = new Runtime(mockExecutor, "docker");

    vi.mocked(clack.select)
      .mockResolvedValueOnce("harnesses")
      .mockResolvedValueOnce("done")
      .mockResolvedValueOnce("skip");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["opencode", "gemini"]);

    await settingsCommand(runtime, settingsStore, stateStore, fsReader);

    const saved = settingsStore.load();
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.enabledHarnesses).toEqual(["gemini", "opencode"]);
  });

  it("triggers harness rebuild when selected", async () => {
    const { settingsStore, stateStore } = setupStores();
    const runtime = new Runtime(mockExecutor, "docker");

    enqueue({ status: 0 });
    enqueue({ status: 0 });

    vi.mocked(clack.select)
      .mockResolvedValueOnce("harnesses")
      .mockResolvedValueOnce("done")
      .mockResolvedValueOnce("harness");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["opencode", "claude"]);

    await settingsCommand(runtime, settingsStore, stateStore, fsReader);

    const buildCalls = calls.filter(c => c.args[0] === "build");
    expect(buildCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("updates runtime", async () => {
    const { settingsStore, stateStore } = setupStores();
    const runtime = new Runtime(mockExecutor, "docker");

    vi.mocked(clack.select)
      .mockResolvedValueOnce("runtime")
      .mockResolvedValueOnce("podman")
      .mockResolvedValueOnce("done");

    await settingsCommand(runtime, settingsStore, stateStore, fsReader);

    const saved = settingsStore.load();
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.runtime).toBe("podman");
  });

  it("updates system mounts", async () => {
    const { settingsStore, stateStore } = setupStores();
    const runtime = new Runtime(mockExecutor, "docker");

    vi.mocked(clack.select)
      .mockResolvedValueOnce("mounts")
      .mockResolvedValueOnce("done");
    vi.mocked(clack.confirm)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await settingsCommand(runtime, settingsStore, stateStore, fsReader);

    const saved = settingsStore.load();
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.systemMounts).toEqual({ ssh: true, gitconfig: false });
  });

  it("handles cancel on main menu", async () => {
    const { settingsStore, stateStore } = setupStores();
    const runtime = new Runtime(mockExecutor, "docker");

    vi.mocked(clack.select).mockResolvedValueOnce(Symbol("cancel"));
    vi.mocked(clack.isCancel).mockReturnValueOnce(true);

    await settingsCommand(runtime, settingsStore, stateStore, fsReader);

    expect(clack.outro).toHaveBeenCalledWith("Settings saved");
  });

  it("does not offer rebuild when harnesses unchanged", async () => {
    const { settingsStore, stateStore } = setupStores();
    const runtime = new Runtime(mockExecutor, "docker");

    vi.mocked(clack.select)
      .mockResolvedValueOnce("runtime")
      .mockResolvedValueOnce("docker")
      .mockResolvedValueOnce("done");

    await settingsCommand(runtime, settingsStore, stateStore, fsReader);

    const selectCalls = vi.mocked(clack.select).mock.calls;
    const rebuildCall = selectCalls.find(
      c => typeof c[0] === "object" && c[0]?.message?.includes("Rebuild"),
    );
    expect(rebuildCall).toBeUndefined();
  });

  it("updates enabledTools and saves buildDirty: tools when skipped", async () => {
    const { settingsStore, stateStore } = setupStores();
    const runtime = new Runtime(mockExecutor, "docker");

    vi.mocked(clack.select)
      .mockResolvedValueOnce("tools")
      .mockResolvedValueOnce("done")
      .mockResolvedValueOnce("skip");
    vi.mocked(clack.multiselect).mockResolvedValueOnce(["bun", "deno"]);

    await settingsCommand(runtime, settingsStore, stateStore, fsReader);

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
