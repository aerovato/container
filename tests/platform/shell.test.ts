import { describe, it, expect, beforeEach } from "vitest";
import {
  Executor,
  createExecutor,
  commandExists,
  getRuntimeAvailability,
  getDefaultRuntime,
} from "../../src/platform/shell";
import { Platform } from "../../src/platform/os";
import { withPlatform } from "./helpers";

const calls: Array<{ bin: string; args: string[] }> = [];
const queue: Array<number | null> = [];

function enqueue(...statuses: Array<number | null>): void {
  queue.push(...statuses);
}

const executor: Executor = {
  spawnSync(bin: string, args: string[]) {
    calls.push({ bin, args });
    const status = queue.shift() ?? 0;
    return { status, stdout: "", stderr: "" };
  },
};

beforeEach(() => {
  calls.length = 0;
  queue.length = 0;
});

describe("createExecutor", () => {
  it("returns an executor exposing spawnSync", () => {
    const exec = createExecutor();
    expect(typeof exec.spawnSync).toBe("function");
  });
});

describe("commandExists", () => {
  it("uses which on POSIX", () => {
    withPlatform(Platform.Linux, () => {
      enqueue(0);
      expect(commandExists(executor, "docker")).toBe(true);
    });
    expect(calls[0]).toEqual({ bin: "which", args: ["docker"] });
  });

  it("uses where on Windows", () => {
    withPlatform(Platform.Windows, () => {
      enqueue(0);
      expect(commandExists(executor, "docker")).toBe(true);
    });
    expect(calls[0]).toEqual({ bin: "where", args: ["docker"] });
  });

  it("returns false on non-zero exit", () => {
    withPlatform(Platform.Linux, () => {
      enqueue(1);
      expect(commandExists(executor, "missing")).toBe(false);
    });
  });
});

describe("getRuntimeAvailability", () => {
  it("queries docker then podman and maps status to booleans", () => {
    enqueue(0, 1);
    expect(getRuntimeAvailability(executor)).toEqual({
      docker: true,
      podman: false,
    });
    expect(calls.map(c => c.bin)).toEqual(["docker", "podman"]);
    expect(calls.map(c => c.args)).toEqual([["--version"], ["--version"]]);
  });

  it("reports both available when both exit zero", () => {
    enqueue(0, 0);
    expect(getRuntimeAvailability(executor)).toEqual({
      docker: true,
      podman: true,
    });
  });

  it("reports neither available when both exit non-zero", () => {
    enqueue(1, 1);
    expect(getRuntimeAvailability(executor)).toEqual({
      docker: false,
      podman: false,
    });
  });
});

describe("getDefaultRuntime", () => {
  it("returns docker when only docker available", () => {
    enqueue(0, 1);
    expect(getDefaultRuntime(executor)).toBe("docker");
  });

  it("returns podman when only podman available", () => {
    enqueue(1, 0);
    expect(getDefaultRuntime(executor)).toBe("podman");
  });

  it("returns undefined when neither available", () => {
    enqueue(1, 1);
    expect(getDefaultRuntime(executor)).toBeUndefined();
  });

  it("returns podman when both on linux", () => {
    withPlatform(Platform.Linux, () => {
      enqueue(0, 0);
      expect(getDefaultRuntime(executor)).toBe("podman");
    });
  });

  it("returns docker when both on macOS", () => {
    withPlatform(Platform.Macos, () => {
      enqueue(0, 0);
      expect(getDefaultRuntime(executor)).toBe("docker");
    });
  });

  it("returns docker when both on Windows", () => {
    withPlatform(Platform.Windows, () => {
      enqueue(0, 0);
      expect(getDefaultRuntime(executor)).toBe("docker");
    });
  });
});
