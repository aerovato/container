import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";
import os from "os";
import { fs, vol } from "memfs";
import { ContainerClient } from "../src/container-client";
import { Executor } from "../src/platform/shell";
import { FsReader, Filesystem } from "../src/platform/fs";
import {
  APPDATA_DIR,
  TEMP_DIR,
  generateContainerName,
  CORE_DOCKERFILE_PATH,
  TOOLS_DOCKERFILE_PATH,
  HARNESS_DOCKERFILE_PATH,
} from "../src/platform/paths";
import { SettingsStore, StateStore } from "../src/config";
import { buildImage } from "../src/docker";
import {
  generateDockerfileCore,
  resolveCoreConfig,
  DEFAULT_PROMPT_COMMAND,
  DEFAULT_CORE_COMMANDS,
} from "../src/dockerfile-core";
import { generateDockerfileHarness } from "../src/dockerfile-harness";
import { generateDockerfileTools } from "../src/dockerfile-tools";
import {
  stopContainerIfLastSession,
  createNewContainer,
  getMounts,
  stopOrphanedContainers,
} from "../src/container";
import { Settings } from "../src/types";

vi.mock("fs");

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

const fsReader = new Filesystem(fs as unknown as FsReader);

beforeEach(() => {
  reset();
  vol.reset();
});

afterEach(() => {
  if (queue.length > 0) {
    throw new Error(`${queue.length} unconsumed mock responses remaining`);
  }
});

describe("generateContainerName", () => {
  it("strips trailing slash from path", () => {
    const withSlash = generateContainerName("/home/user/project/");
    const withoutSlash = generateContainerName("/home/user/project");
    expect(withSlash).toBe(withoutSlash);
    expect(withSlash).toMatch(/^container-project-[a-f0-9]{8}$/);
  });

  it("generates consistent hash for same path", () => {
    expect(generateContainerName("/home/user/myproject")).toBe(
      generateContainerName("/home/user/myproject"),
    );
  });

  it("generates different hashes for different paths", () => {
    expect(generateContainerName("/home/user/project1")).not.toBe(
      generateContainerName("/home/user/project2"),
    );
  });
});

describe("Runtime", () => {
  const runtime = new ContainerClient(mockExecutor, "docker");

  describe("imageExists", () => {
    it("returns true when status is 0", () => {
      enqueue({ status: 0 });
      expect(runtime.imageExists("test:latest")).toBe(true);
    });

    it("returns false when status is non-zero", () => {
      enqueue({ status: 1 });
      expect(runtime.imageExists("test:latest")).toBe(false);
    });
  });

  describe("containerExists", () => {
    it("returns true when status is 0", () => {
      enqueue({ status: 0 });
      expect(runtime.containerExists("container-foo-abc12345")).toBe(true);
    });

    it("returns false when status is non-zero", () => {
      enqueue({ status: 1 });
      expect(runtime.containerExists("container-foo-abc12345")).toBe(false);
    });
  });

  describe("containerRunning", () => {
    it("returns true when status is 0 and stdout is 'true'", () => {
      enqueue({ status: 0, stdout: "true\n" });
      expect(runtime.containerRunning("container-foo-abc12345")).toBe(true);
    });

    it("returns false when status is 0 but stdout is 'false'", () => {
      enqueue({ status: 0, stdout: "false\n" });
      expect(runtime.containerRunning("container-foo-abc12345")).toBe(false);
    });

    it("returns false when status is non-zero", () => {
      enqueue({ status: 1 });
      expect(runtime.containerRunning("container-foo-abc12345")).toBe(false);
    });
  });

  describe("isAvailable", () => {
    it("returns true when status is 0", () => {
      enqueue({ status: 0 });
      expect(runtime.isAvailable()).toBe(true);
    });

    it("returns false when status is non-zero", () => {
      enqueue({ status: 1 });
      expect(runtime.isAvailable()).toBe(false);
    });
  });

  describe("daemonRunning", () => {
    it("returns true when status is 0", () => {
      enqueue({ status: 0 });
      expect(runtime.daemonRunning()).toBe(true);
    });

    it("returns false when status is non-zero", () => {
      enqueue({ status: 1 });
      expect(runtime.daemonRunning()).toBe(false);
    });
  });
});

describe("attachedSessionCount", () => {
  it("returns 0 when docker top fails", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 1 });
    expect(runtime.attachedSessionCount("container-foo-abc12345")).toBe(0);
  });

  it("counts bash sessions", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({
      status: 0,
      stdout:
        "UID PID PPID C STIME TTY TIME CMD\n"
        + "root 1 0 0 14:00 ? 00:00 sleep infinity\n"
        + "root 222 1 0 14:01 pts/0 00:00 /bin/bash\n"
        + "root 333 1 0 14:02 pts/1 00:00 /bin/bash\n",
    });
    expect(runtime.attachedSessionCount("container-foo-abc12345")).toBe(2);
  });

  it("does not count non-bash processes", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({
      status: 0,
      stdout: "root 1 0 0 14:00 ? 00:00 sleep infinity\nother process\n",
    });
    expect(runtime.attachedSessionCount("container-foo-abc12345")).toBe(0);
  });
});

describe("stopContainerIfLastSession", () => {
  it("stops when no other sessions", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({ status: 0, stdout: "root 1 0 0 14:00 ? 00:00 sleep infinity\n" });
    enqueue({ status: 0 });
    stopContainerIfLastSession(runtime, "container-foo-abc12345");
    const stopCall = calls.find(c => c.args[0] === "stop");
    expect(stopCall).toBeDefined();
  });

  it("skips stop when other sessions exist", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    enqueue({
      status: 0,
      stdout: "root 222 1 0 14:01 pts/0 00:00 /bin/bash\n",
    });
    stopContainerIfLastSession(runtime, "container-foo-abc12345");
    const stopCall = calls.find(c => c.args[0] === "stop");
    expect(stopCall).toBeUndefined();
  });
});

describe("createNewContainer", () => {
  it("constructs correct docker run arguments", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    const settings: Settings = {};
    enqueue({ status: 0 });

    const result = createNewContainer(
      runtime,
      "container-foo-abc12345",
      "foo",
      "/home/user/foo",
      settings,
      [],
    );

    expect(result.ok).toBe(true);
    const runCall = calls[calls.length - 1];
    expect(runCall.command).toBe("docker");
    expect(runCall.args[0]).toBe("run");
    expect(runCall.args).toContain("-d");
    expect(runCall.args).toContain("--name");
    expect(runCall.args).toContain("container-foo-abc12345");
    expect(runCall.args).toContain("TERM=xterm-256color");
    expect(runCall.args).toContain("COLORTERM=truecolor");
    expect(runCall.args).toContain("-w");
    expect(runCall.args).toContain("/root/foo");
    expect(runCall.args).toContain("-v");
    expect(runCall.args).toContain("/home/user/foo:/root/foo");
  });

  it("includes cliFlags in the argument list", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    const settings: Settings = {};
    enqueue({ status: 0 });

    createNewContainer(
      runtime,
      "container-foo-abc12345",
      "foo",
      "/home/user/foo",
      settings,
      ["-p", "8080:80"],
    );

    const runCall = calls[calls.length - 1];
    expect(runCall.args).toContain("-p");
    expect(runCall.args).toContain("8080:80");
  });

  it("returns failure on non-zero exit", () => {
    const runtime = new ContainerClient(mockExecutor, "docker");
    const settings: Settings = {};
    enqueue({ status: 1 });

    const result = createNewContainer(runtime, "c", "p", "/path", settings, []);
    expect(result.ok).toBe(false);
  });
});

describe("buildImage", () => {
  function seedDirs() {
    fs.mkdirSync(APPDATA_DIR, { recursive: true });
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(APPDATA_DIR, "Dockerfile.User"),
      "FROM localhost/aerovato/container-v3-harness:latest",
    );
  }

  function makeStores() {
    const settingsStore = new SettingsStore(
      fsReader,
      path.join(APPDATA_DIR, "settings.json"),
    );
    const stateStore = new StateStore(
      fsReader,
      path.join(TEMP_DIR, "state.json"),
    );
    return { settingsStore, stateStore };
  }

  describe("full target", () => {
    it("builds all 4 stages", () => {
      seedDirs();
      const runtime = new ContainerClient(mockExecutor, "docker");
      const { settingsStore, stateStore } = makeStores();
      enqueue({ status: 0 });
      enqueue({ status: 0 });
      enqueue({ status: 0 });
      enqueue({ status: 0 });
      enqueue({ status: 0 });

      const result = buildImage(
        runtime,
        settingsStore,
        stateStore,
        fsReader,
        "full",
      );
      expect(result.ok).toBe(true);

      const builds = calls.filter(c => c.args[0] === "build");
      expect(builds).toHaveLength(4);
    });

    it("generates Dockerfile.Core and Dockerfile.Harness to temp", () => {
      seedDirs();
      const runtime = new ContainerClient(mockExecutor, "docker");
      const { settingsStore, stateStore } = makeStores();
      enqueue({ status: 0 });
      enqueue({ status: 0 });
      enqueue({ status: 0 });
      enqueue({ status: 0 });

      buildImage(runtime, settingsStore, stateStore, fsReader, "full");

      expect(fs.existsSync(CORE_DOCKERFILE_PATH)).toBe(true);
      expect(fs.existsSync(TOOLS_DOCKERFILE_PATH)).toBe(true);
      expect(fs.existsSync(HARNESS_DOCKERFILE_PATH)).toBe(true);
    });
  });

  describe("harness target", () => {
    it("builds 2 stages (harness, user)", () => {
      seedDirs();
      const runtime = new ContainerClient(mockExecutor, "docker");
      const { settingsStore, stateStore } = makeStores();
      enqueue({ status: 0 });
      enqueue({ status: 0 });
      enqueue({ status: 0 });

      const result = buildImage(
        runtime,
        settingsStore,
        stateStore,
        fsReader,
        "harness",
      );
      expect(result.ok).toBe(true);

      const builds = calls.filter(c => c.args[0] === "build");
      expect(builds).toHaveLength(2);
    });
  });

  describe("user target", () => {
    it("builds only the user stage", () => {
      seedDirs();
      const runtime = new ContainerClient(mockExecutor, "docker");
      const { settingsStore, stateStore } = makeStores();
      enqueue({ status: 0 });
      enqueue({ status: 0 });

      const result = buildImage(
        runtime,
        settingsStore,
        stateStore,
        fsReader,
        "user",
      );
      expect(result.ok).toBe(true);

      const builds = calls.filter(c => c.args[0] === "build");
      expect(builds).toHaveLength(1);
    });
  });

  describe("failure handling", () => {
    it("returns failure when core stage fails", () => {
      seedDirs();
      const runtime = new ContainerClient(mockExecutor, "docker");
      const { settingsStore, stateStore } = makeStores();
      enqueue({ status: 1 });

      const result = buildImage(
        runtime,
        settingsStore,
        stateStore,
        fsReader,
        "full",
      );
      expect(result.ok).toBe(false);
      const builds = calls.filter(c => c.args[0] === "build");
      expect(builds).toHaveLength(1);
    });

    it("returns failure when harness stage fails", () => {
      seedDirs();
      const runtime = new ContainerClient(mockExecutor, "docker");
      const { settingsStore, stateStore } = makeStores();
      enqueue({ status: 0 });
      enqueue({ status: 1 });

      const result = buildImage(
        runtime,
        settingsStore,
        stateStore,
        fsReader,
        "full",
      );
      expect(result.ok).toBe(false);
      const builds = calls.filter(c => c.args[0] === "build");
      expect(builds).toHaveLength(2);
    });
  });

  describe("buildDirty clearing", () => {
    it("full build clears buildDirty", () => {
      seedDirs();
      const runtime = new ContainerClient(mockExecutor, "docker");
      const { settingsStore, stateStore } = makeStores();
      stateStore.save({ buildDirty: "tools" });
      enqueue({ status: 0 });
      enqueue({ status: 0 });
      enqueue({ status: 0 });
      enqueue({ status: 0 });
      enqueue({ status: 0 });

      buildImage(runtime, settingsStore, stateStore, fsReader, "full");

      const state = stateStore.load();
      expect(state.ok).toBe(true);
      if (!state.ok) return;
      expect(state.value.buildDirty).toBeUndefined();
    });

    it("harness build clears only harness dirty", () => {
      seedDirs();
      const runtime = new ContainerClient(mockExecutor, "docker");
      const { settingsStore, stateStore } = makeStores();
      stateStore.save({ buildDirty: "harness" });
      enqueue({ status: 0 });
      enqueue({ status: 0 });
      enqueue({ status: 0 });

      buildImage(runtime, settingsStore, stateStore, fsReader, "harness");

      const state = stateStore.load();
      expect(state.ok).toBe(true);
      if (!state.ok) return;
      expect(state.value.buildDirty).toBeUndefined();
    });

    it("harness build leaves tools dirty intact", () => {
      seedDirs();
      const runtime = new ContainerClient(mockExecutor, "docker");
      const { settingsStore, stateStore } = makeStores();
      stateStore.save({ buildDirty: "tools" });
      enqueue({ status: 0 });
      enqueue({ status: 0 });
      enqueue({ status: 0 });

      buildImage(runtime, settingsStore, stateStore, fsReader, "harness");

      const state = stateStore.load();
      expect(state.ok).toBe(true);
      if (!state.ok) return;
      expect(state.value.buildDirty).toBe("tools");
    });
  });
});

describe("generateDockerfileCore", () => {
  it("generates all sections with defaults", () => {
    const config = resolveCoreConfig({});
    const result = generateDockerfileCore(config);
    expect(result).toContain("FROM ubuntu:24.04");
    expect(result).toContain("WORKDIR /root");
    expect(result).toContain('CMD ["bin/bash"]'.replace("bin", "/bin"));
    expect(result).toContain(DEFAULT_PROMPT_COMMAND);
    expect(result).toContain(DEFAULT_CORE_COMMANDS);
  });

  it("omits default commands when disabled", () => {
    const config = resolveCoreConfig({ disableDefaultCommands: true });
    const result = generateDockerfileCore(config);
    expect(result).toContain("FROM ubuntu:24.04");
    expect(result).not.toContain("apt-get update");
  });

  it("includes custom commands", () => {
    const config = resolveCoreConfig({
      customCommands: ["RUN echo hello", "RUN echo world"],
    });
    const result = generateDockerfileCore(config);
    expect(result).toContain("RUN echo hello\nRUN echo world");
  });

  it("uses custom base image", () => {
    const config = resolveCoreConfig({ baseImage: "debian:12" });
    const result = generateDockerfileCore(config);
    expect(result).toContain("FROM debian:12");
    expect(result).not.toContain("FROM ubuntu:24.04");
  });

  it("user config overrides defaults", () => {
    const config = resolveCoreConfig({ workdir: "/app" });
    expect(config.workdir).toBe("/app");
    expect(config.baseImage).toBe("ubuntu:24.04");
  });
});

describe("generateDockerfileHarness", () => {
  it("generates FROM preamble with no harnesses", () => {
    const result = generateDockerfileHarness([]);
    expect(result).toBe(
      "FROM localhost/aerovato/container-v3-tools\nLABEL aerovato.container=v3\n",
    );
  });

  it("includes dockerfileLines for enabled harnesses", () => {
    const result = generateDockerfileHarness(["claude"]);
    expect(result).toContain("FROM localhost/aerovato/container-v3-tools");
    expect(result).toContain("curl -fsSL https://claude.ai/install.sh");
  });

  it("includes dockerfileLines for multiple harnesses", () => {
    const result = generateDockerfileHarness(["claude", "codex"]);
    expect(result).toContain("curl -fsSL https://claude.ai/install.sh");
    expect(result).toContain("npm install -g @openai/codex");
  });

  it("skips unknown harness ids", () => {
    const result = generateDockerfileHarness(["nonexistent"]);
    expect(result).toBe(
      "FROM localhost/aerovato/container-v3-tools\nLABEL aerovato.container=v3\n",
    );
  });
});

describe("getMounts", () => {
  const home = os.homedir();

  it("mounts project path", () => {
    const mounts = getMounts("/home/user/foo", "foo", {});
    expect(mounts).toContain("/home/user/foo:/root/foo");
  });

  it("mounts harness configs for enabled harnesses", () => {
    const mounts = getMounts("/home/user/foo", "foo", {
      enabledHarnesses: ["claude"],
    });
    const claudeConfig = mounts.find(
      m => m.includes(".claude") && !m.includes(".json"),
    );
    expect(claudeConfig).toBeDefined();
  });

  it("mounts ssh when enabled", () => {
    const mounts = getMounts("/home/user/foo", "foo", {
      systemMounts: { ssh: true },
    });
    expect(mounts).toContain(`${home}/.ssh:/root/.ssh:ro`);
  });

  it("skips ssh by default", () => {
    const mounts = getMounts("/home/user/foo", "foo", {});
    const sshMount = mounts.find(m => m.includes(".ssh"));
    expect(sshMount).toBeUndefined();
  });
});

describe("listRunningManagedContainers", () => {
  const runtime = new ContainerClient(mockExecutor, "docker");

  it("returns container names from stdout", () => {
    enqueue({
      status: 0,
      stdout: "container-foo-abc12345\ncontainer-bar-def67890\n",
    });
    const names = runtime.listRunningManagedContainers();
    expect(names).toEqual(["container-foo-abc12345", "container-bar-def67890"]);
  });

  it("returns empty array when ps fails", () => {
    enqueue({ status: 1 });
    const names = runtime.listRunningManagedContainers();
    expect(names).toEqual([]);
  });

  it("returns empty array for empty output", () => {
    enqueue({ status: 0, stdout: "" });
    const names = runtime.listRunningManagedContainers();
    expect(names).toEqual([]);
  });
});

describe("containerStartedAt", () => {
  const runtime = new ContainerClient(mockExecutor, "docker");

  it("returns timestamp string when status is 0", () => {
    enqueue({ status: 0, stdout: "2026-06-11T14:30:00.123456789Z\n" });
    const result = runtime.containerStartedAt("container-foo-abc12345");
    expect(result).toBe("2026-06-11T14:30:00.123456789Z");
  });

  it("returns null when status is non-zero", () => {
    enqueue({ status: 1 });
    const result = runtime.containerStartedAt("container-foo-abc12345");
    expect(result).toBeNull();
  });
});

describe("stopOrphanedContainers", () => {
  const runtime = new ContainerClient(mockExecutor, "docker");
  let dateNowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dateNowSpy = vi.spyOn(Date, "now");
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });
  it("stops orphaned container past threshold with no sessions", () => {
    dateNowSpy.mockReturnValue(new Date("2026-06-11T14:10:00Z").getTime());

    enqueue({ status: 0, stdout: "container-myproject-abc12345\n" });
    enqueue({ status: 0, stdout: "2026-06-11T14:00:00Z\n" });
    enqueue({ status: 0, stdout: "root 1 0 0 14:00 ? 00:00 sleep infinity\n" });
    enqueue({ status: 0 });

    stopOrphanedContainers(runtime);

    const stopCall = calls.find(c => c.args[0] === "stop");
    expect(stopCall).toBeDefined();
    expect(stopCall!.args).toContain("container-myproject-abc12345");
  });

  it("skips container within threshold", () => {
    dateNowSpy.mockReturnValue(new Date("2026-06-11T14:02:00Z").getTime());

    enqueue({ status: 0, stdout: "container-myproject-abc12345\n" });
    enqueue({ status: 0, stdout: "2026-06-11T14:00:00Z\n" });

    stopOrphanedContainers(runtime);

    const stopCall = calls.find(c => c.args[0] === "stop");
    expect(stopCall).toBeUndefined();
  });

  it("skips container with active sessions", () => {
    dateNowSpy.mockReturnValue(new Date("2026-06-11T14:10:00Z").getTime());

    enqueue({ status: 0, stdout: "container-myproject-abc12345\n" });
    enqueue({ status: 0, stdout: "2026-06-11T14:00:00Z\n" });
    enqueue({
      status: 0,
      stdout: "root 222 1 0 14:01 pts/0 00:00 /bin/bash\n",
    });

    stopOrphanedContainers(runtime);

    const stopCall = calls.find(c => c.args[0] === "stop");
    expect(stopCall).toBeUndefined();
  });

  it("skips container when startedAt returns null", () => {
    dateNowSpy.mockReturnValue(new Date("2026-06-11T14:10:00Z").getTime());

    enqueue({ status: 0, stdout: "container-myproject-abc12345\n" });
    enqueue({ status: 1 });

    stopOrphanedContainers(runtime);

    const stopCall = calls.find(c => c.args[0] === "stop");
    expect(stopCall).toBeUndefined();
  });

  it("processes multiple containers", () => {
    dateNowSpy.mockReturnValue(new Date("2026-06-11T14:10:00Z").getTime());

    enqueue({
      status: 0,
      stdout: "container-foo-abc12345\ncontainer-bar-def67890\n",
    });
    enqueue({ status: 0, stdout: "2026-06-11T14:00:00Z\n" });
    enqueue({ status: 0, stdout: "root 1 0 0 14:00 ? 00:00 sleep infinity\n" });
    enqueue({ status: 0 });
    enqueue({ status: 0, stdout: "2026-06-11T14:00:00Z\n" });
    enqueue({
      status: 0,
      stdout: "root 222 1 0 14:01 pts/0 00:00 /bin/bash\n",
    });

    stopOrphanedContainers(runtime);

    const stopCalls = calls.filter(c => c.args[0] === "stop");
    expect(stopCalls).toHaveLength(1);
    expect(stopCalls[0]!.args).toContain("container-foo-abc12345");
  });
});

describe("generateDockerfileTools", () => {
  it("generates FROM preamble with no tools", () => {
    const result = generateDockerfileTools([]);
    expect(result).toBe(
      "FROM localhost/aerovato/container-v3-core\nLABEL aerovato.container=v3\n",
    );
  });

  it("includes dockerfileLines for enabled tools", () => {
    const result = generateDockerfileTools(["bun", "deno"]);
    expect(result).toContain("FROM localhost/aerovato/container-v3-core");
    expect(result).toContain("curl -fsSL https://bun.sh/install | bash");
    expect(result).toContain("curl -fsSL https://deno.land/install.sh | sh");
  });

  it("skips unknown tool ids", () => {
    const result = generateDockerfileTools(["nonexistent"]);
    expect(result).toBe(
      "FROM localhost/aerovato/container-v3-core\nLABEL aerovato.container=v3\n",
    );
  });
});
