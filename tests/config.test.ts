import path from "path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fs, vol } from "memfs";
import {
  APPDATA_DIR,
  TEMP_DIR,
  SETTINGS_PATH,
  STATE_PATH,
} from "../src/platform/paths";
import { SettingsStore, StateStore } from "../src/config";
import { FsReader, Filesystem } from "../src/platform/fs";
import { maybeCheckForUpdate } from "../src/update-check";

const SETTINGS_DIR = path.dirname(SETTINGS_PATH);
const fsReader = new Filesystem(fs as unknown as FsReader);

vi.mock("fs");

beforeEach(() => {
  vol.reset();
});

describe("SettingsStore", () => {
  it("returns empty object when file does not exist", () => {
    const store = new SettingsStore(fsReader, SETTINGS_PATH);
    const result = store.load();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({});
  });

  it("loads parsed settings from valid JSON", () => {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    fs.writeFileSync(
      SETTINGS_PATH,
      JSON.stringify({ runtime: "docker", onboardingVersion: 3 }),
    );
    const store = new SettingsStore(fsReader, SETTINGS_PATH);
    const result = store.load();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ runtime: "docker", onboardingVersion: 3 });
  });

  it("returns error on invalid JSON", () => {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, "not json");
    const store = new SettingsStore(fsReader, SETTINGS_PATH);
    const result = store.load();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("invalid_json");
  });

  it("returns error when settings fail Zod validation", () => {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    fs.writeFileSync(
      SETTINGS_PATH,
      JSON.stringify({ runtime: "not_a_runtime" }),
    );
    const store = new SettingsStore(fsReader, SETTINGS_PATH);
    const result = store.load();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("validation_failed");
  });
});

describe("StateStore", () => {
  it("returns empty object when file does not exist", () => {
    const store = new StateStore(fsReader, STATE_PATH);
    const result = store.load();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({});
  });

  it("loads state from valid JSON", () => {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    fs.writeFileSync(
      STATE_PATH,
      JSON.stringify({ buildDirty: "harness", lastUpdateCheck: 123 }),
    );
    const store = new StateStore(fsReader, STATE_PATH);
    const result = store.load();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      buildDirty: "harness",
      lastUpdateCheck: 123,
    });
  });

  it("returns error on invalid JSON", () => {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    fs.writeFileSync(STATE_PATH, "bad");
    const store = new StateStore(fsReader, STATE_PATH);
    const result = store.load();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("invalid_json");
  });
});

describe("SettingsStore save", () => {
  it("writes settings as JSON and creates dirs", () => {
    const store = new SettingsStore(fsReader, SETTINGS_PATH);
    const result = store.save({ runtime: "docker" });
    expect(result.ok).toBe(true);
    const content = fs.readFileSync(SETTINGS_PATH, "utf-8") as string;
    expect(JSON.parse(content)).toEqual({ runtime: "docker" });
    expect(fs.existsSync(APPDATA_DIR)).toBe(true);
  });
});

describe("StateStore save", () => {
  it("writes state as JSON and creates dirs", () => {
    const store = new StateStore(fsReader, STATE_PATH);
    const result = store.save({ buildDirty: "tools" });
    expect(result.ok).toBe(true);
    const content = fs.readFileSync(STATE_PATH, "utf-8") as string;
    expect(JSON.parse(content)).toEqual({ buildDirty: "tools" });
    expect(fs.existsSync(TEMP_DIR)).toBe(true);
  });
});

describe("maybeCheckForUpdate", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mockFetch.mockReset();
  });

  it("skips check if within one day", async () => {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    fs.writeFileSync(
      STATE_PATH,
      JSON.stringify({ lastUpdateCheck: Date.now() - 1000 }),
    );
    const store = new StateStore(fsReader, STATE_PATH);
    const result = await maybeCheckForUpdate(store, "3.0.0");
    expect(result).toBe(null);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns update info when newer version available", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ version: "3.1.0" }),
    });
    const store = new StateStore(fsReader, STATE_PATH);
    const result = await maybeCheckForUpdate(store, "3.0.0");
    expect(result).toEqual({ current: "3.0.0", latest: "3.1.0" });
    const saved = store.load();
    if (saved.ok) {
      expect(saved.value.lastUpdateCheck).toBeGreaterThan(Date.now() - 10000);
    }
  });

  it("returns null for same version", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ version: "3.0.0" }),
    });
    const store = new StateStore(fsReader, STATE_PATH);
    const result = await maybeCheckForUpdate(store, "3.0.0");
    expect(result).toBe(null);
  });

  it("returns null and updates timestamp on fetch failure", async () => {
    mockFetch.mockRejectedValue(new Error("network"));
    const store = new StateStore(fsReader, STATE_PATH);
    const result = await maybeCheckForUpdate(store, "3.0.0");
    expect(result).toBe(null);
    const saved = store.load();
    if (saved.ok) {
      expect(typeof saved.value.lastUpdateCheck).toBe("number");
    }
  });
});
