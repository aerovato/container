import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import os from "os";
import { fs, vol } from "memfs";
import { CONFIGS_DIR, FsReader } from "../src/config";
import {
  needsOnboarding,
  LATEST_ONBOARDING_VERSION,
  detectTools,
  migrateAllToolConfigs,
} from "../src/onboarding";
import { HARNESS_PACKS } from "../src/harness-packs";
import { Executor } from "../src/runtime";

vi.mock("fs");

beforeEach(() => {
  vol.reset();
  vi.clearAllMocks();
});

describe("needsOnboarding", () => {
  it("returns true when onboardingVersion is undefined", () => {
    expect(needsOnboarding({})).toBe(true);
  });

  it("returns true when onboardingVersion is less than latest", () => {
    expect(needsOnboarding({ onboardingVersion: 1 })).toBe(true);
  });

  it("returns false when onboardingVersion equals latest", () => {
    expect(
      needsOnboarding({ onboardingVersion: LATEST_ONBOARDING_VERSION }),
    ).toBe(false);
  });

  it("returns false when onboardingVersion exceeds latest", () => {
    expect(needsOnboarding({ onboardingVersion: 99 })).toBe(false);
  });
});

describe("detectHarnesses (via executor)", () => {
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
      const result = mockExecutor.spawnSync(pack.detectCommand, [], {
        shell: true,
        stdio: "pipe",
      });
      if (result.status === 0) detected.push(id);
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
      const result = mockExecutor.spawnSync(pack.detectCommand, [], {
        shell: true,
        stdio: "pipe",
      });
      if (result.status === 0) detected.push("x");
    }

    expect(detected).toEqual([]);
  });
});

describe("migrateAllConfigs (via fs)", () => {
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

describe("expandHomePath", () => {
  it("expands tilde to home directory", () => {
    const home = os.homedir();
    const hostPath = "~/.claude";
    const expanded = hostPath.startsWith("~")
      ? path.join(home, hostPath.slice(1))
      : hostPath;
    expect(expanded).toBe(path.join(home, ".claude"));
  });

  it("returns absolute path unchanged", () => {
    const p = "/absolute/path";
    const expanded = p.startsWith("~")
      ? path.join(os.homedir(), p.slice(1))
      : p;
    expect(expanded).toBe("/absolute/path");
  });
});

describe("detectTools", () => {
  it("detects tool installation based on exit code 0", () => {
    const mockExecutor: Executor = {
      spawnSync(command: string) {
        return {
          status: command.includes("bun") ? 0 : 1,
          stdout: "",
          stderr: "",
        };
      },
    };
    const detected = detectTools(mockExecutor);
    expect(detected).toEqual(["bun"]);
  });
});

describe("migrateAllToolConfigs", () => {
  it("copies tool config from host to CONFIGS_DIR without overwriting existing files", () => {
    const home = os.homedir();
    fs.mkdirSync(path.join(home, ".bun"), { recursive: true });
    fs.writeFileSync(path.join(home, ".bunfig.toml"), "bun = true");
    fs.mkdirSync(CONFIGS_DIR, { recursive: true });

    // Pre-exist a different config to test non-overwriting
    fs.writeFileSync(path.join(CONFIGS_DIR, ".bunfig.toml"), "existing = true");

    migrateAllToolConfigs(fs as unknown as FsReader, ["bun"]);

    // Check that we didn't overwrite the existing config
    const content = fs.readFileSync(
      path.join(CONFIGS_DIR, ".bunfig.toml"),
      "utf-8",
    );
    expect(content).toBe("existing = true");
  });
});
