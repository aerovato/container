import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import { fs, vol } from "memfs";
import { SETTINGS_PATH, SettingsStore, FsReader } from "../src/config";
import { ensureTosAccepted, LATEST_TOS_VERSION } from "../src/tos";

vi.mock("fs");
vi.mock("@clack/prompts", () => ({
  note: vi.fn(),
  confirm: vi.fn(),
  cancel: vi.fn(),
  isCancel: vi.fn(() => false),
}));

import * as clack from "@clack/prompts";

const fsReader = fs as unknown as FsReader;

beforeEach(() => {
  vol.reset();
  vi.clearAllMocks();
});

describe("ensureTosAccepted", () => {
  it("returns true when tosVersion matches latest", async () => {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(
      SETTINGS_PATH,
      JSON.stringify({ tosVersion: LATEST_TOS_VERSION }),
    );
    const store = new SettingsStore(fsReader, SETTINGS_PATH);

    const result = await ensureTosAccepted(store);
    expect(result).toBe(true);
    expect(clack.confirm).not.toHaveBeenCalled();
  });

  it("shows TOS and saves when user accepts", async () => {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({}));
    const store = new SettingsStore(fsReader, SETTINGS_PATH);

    vi.mocked(clack.confirm).mockResolvedValueOnce(true as unknown as symbol);

    const result = await ensureTosAccepted(store);
    expect(result).toBe(true);
    expect(clack.note).toHaveBeenCalled();
    expect(clack.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Do you accept these terms?" }),
    );

    const saved = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8") as string);
    expect(saved.tosVersion).toBe(LATEST_TOS_VERSION);
  });

  it("returns false when user declines", async () => {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({}));
    const store = new SettingsStore(fsReader, SETTINGS_PATH);

    vi.mocked(clack.confirm).mockResolvedValueOnce(false as unknown as symbol);

    const result = await ensureTosAccepted(store);
    expect(result).toBe(false);
    expect(clack.cancel).toHaveBeenCalled();
  });

  it("returns false when user cancels", async () => {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({}));
    const store = new SettingsStore(fsReader, SETTINGS_PATH);

    vi.mocked(clack.isCancel).mockReturnValueOnce(true);
    vi.mocked(clack.confirm).mockResolvedValueOnce(Symbol("cancel"));

    const result = await ensureTosAccepted(store);
    expect(result).toBe(false);
    expect(clack.cancel).toHaveBeenCalled();
  });

  it("returns false when settings load fails", async () => {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, "not json");
    const store = new SettingsStore(fsReader, SETTINGS_PATH);

    const result = await ensureTosAccepted(store);
    expect(result).toBe(false);
    expect(clack.note).not.toHaveBeenCalled();
  });

  it("does not save tosVersion on decline", async () => {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({}));
    const store = new SettingsStore(fsReader, SETTINGS_PATH);

    vi.mocked(clack.confirm).mockResolvedValueOnce(false as unknown as symbol);

    await ensureTosAccepted(store);

    const saved = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8") as string);
    expect(saved.tosVersion).toBeUndefined();
  });
});
