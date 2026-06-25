import { describe, it, expect, vi, beforeEach } from "vitest";
import { fs, vol } from "memfs";
import { FsReader, Filesystem } from "../../src/platform/fs";
import { APPDATA_DIR, CONFIGS_DIR, TEMP_DIR } from "../../src/platform/paths";
import { Platform } from "../../src/platform/os";
import { withPlatform } from "./helpers";

const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

// Builds a recording FsReader: every op is a vi.fn() so call args/counts are
// assertable. `overrides` lets a test pin a return value (e.g. existsSync).
function makeReader(overrides: Partial<FsReader> = {}): FsReader {
  return {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    chmodSync: vi.fn(),
    statSync: vi.fn(),
    readdirSync: vi.fn(),
    cpSync: vi.fn(),
    renameSync: vi.fn(),
    ...overrides,
  } as unknown as FsReader;
}

describe("Filesystem delegation", () => {
  it("delegates raw ops to the injected reader", () => {
    const reader = makeReader();
    const wrap = new Filesystem(reader);
    wrap.existsSync("/a");
    wrap.readFileSync("/f", "utf-8");
    wrap.writeFileSync("/f", "x");
    wrap.mkdirSync("/d", { recursive: true });
    wrap.chmodSync("/d", 0o755);
    wrap.statSync("/f");
    wrap.readdirSync("/d");
    wrap.cpSync("/s", "/d");
    wrap.renameSync("/s", "/d");
    expect(reader.existsSync).toHaveBeenCalledWith("/a");
    expect(reader.readFileSync).toHaveBeenCalledWith("/f", "utf-8");
    expect(reader.writeFileSync).toHaveBeenCalledWith("/f", "x");
    expect(reader.mkdirSync).toHaveBeenCalledWith("/d", { recursive: true });
    expect(reader.chmodSync).toHaveBeenCalledWith("/d", 0o755);
    expect(reader.statSync).toHaveBeenCalled();
    expect(reader.readdirSync).toHaveBeenCalledWith("/d");
    expect(reader.cpSync).toHaveBeenCalledWith("/s", "/d");
    expect(reader.renameSync).toHaveBeenCalledWith("/s", "/d");
  });
});

describe("secureMkdir", () => {
  it("mkdirs with mode and chmods on POSIX", () => {
    const reader = makeReader();
    withPlatform(Platform.Linux, () => {
      new Filesystem(reader).secureMkdir("/x");
    });
    expect(reader.mkdirSync).toHaveBeenCalledWith("/x", {
      recursive: true,
      mode: DIR_MODE,
    });
    expect(reader.chmodSync).toHaveBeenCalledWith("/x", DIR_MODE);
  });

  it("mkdirs without mode and skips chmod on Windows", () => {
    const reader = makeReader();
    withPlatform(Platform.Windows, () => {
      new Filesystem(reader).secureMkdir("/x");
    });
    expect(reader.mkdirSync).toHaveBeenCalledWith("/x", { recursive: true });
    expect(reader.chmodSync).not.toHaveBeenCalled();
  });
});

describe("secureWriteFile", () => {
  it("writes with file mode on POSIX", () => {
    const reader = makeReader();
    withPlatform(Platform.Linux, () => {
      new Filesystem(reader).secureWriteFile("/f", "hi");
    });
    expect(reader.writeFileSync).toHaveBeenCalledWith("/f", "hi", {
      mode: FILE_MODE,
    });
  });

  it("writes without mode on Windows", () => {
    const reader = makeReader();
    withPlatform(Platform.Windows, () => {
      new Filesystem(reader).secureWriteFile("/f", "hi");
    });
    expect(reader.writeFileSync).toHaveBeenCalledWith("/f", "hi");
  });
});

describe("ensureAppdataDir", () => {
  beforeEach(() => vol.reset());

  it("creates APPDATA_DIR when missing", () => {
    const wrap = new Filesystem(fs as unknown as FsReader);
    wrap.ensureAppdataDir();
    expect(fs.existsSync(APPDATA_DIR)).toBe(true);
  });

  it("re-chmods existing APPDATA_DIR on POSIX", () => {
    const reader = makeReader({ existsSync: vi.fn(() => true) });
    withPlatform(Platform.Linux, () => {
      new Filesystem(reader).ensureAppdataDir();
    });
    expect(reader.chmodSync).toHaveBeenCalledWith(APPDATA_DIR, DIR_MODE);
    expect(reader.mkdirSync).not.toHaveBeenCalled();
  });

  it("skips chmod on existing APPDATA_DIR on Windows", () => {
    const reader = makeReader({ existsSync: vi.fn(() => true) });
    withPlatform(Platform.Windows, () => {
      new Filesystem(reader).ensureAppdataDir();
    });
    expect(reader.chmodSync).not.toHaveBeenCalled();
    expect(reader.mkdirSync).not.toHaveBeenCalled();
  });
});

describe("ensureConfigDir", () => {
  beforeEach(() => vol.reset());

  it("creates CONFIGS_DIR", () => {
    const wrap = new Filesystem(fs as unknown as FsReader);
    wrap.ensureConfigDir();
    expect(fs.existsSync(CONFIGS_DIR)).toBe(true);
  });

  it("ensures APPDATA_DIR then CONFIGS_DIR", () => {
    const reader = makeReader({ existsSync: vi.fn(() => false) });
    withPlatform(Platform.Linux, () => {
      new Filesystem(reader).ensureConfigDir();
    });
    expect(reader.mkdirSync).toHaveBeenCalledWith(APPDATA_DIR, {
      recursive: true,
      mode: DIR_MODE,
    });
    expect(reader.mkdirSync).toHaveBeenCalledWith(CONFIGS_DIR, {
      recursive: true,
      mode: DIR_MODE,
    });
  });
});

describe("ensureTempDir", () => {
  beforeEach(() => vol.reset());

  it("creates TEMP_DIR", () => {
    const wrap = new Filesystem(fs as unknown as FsReader);
    wrap.ensureTempDir();
    expect(fs.existsSync(TEMP_DIR)).toBe(true);
  });

  it("ensures APPDATA_DIR then TEMP_DIR", () => {
    const reader = makeReader({ existsSync: vi.fn(() => false) });
    withPlatform(Platform.Linux, () => {
      new Filesystem(reader).ensureTempDir();
    });
    expect(reader.mkdirSync).toHaveBeenCalledWith(APPDATA_DIR, {
      recursive: true,
      mode: DIR_MODE,
    });
    expect(reader.mkdirSync).toHaveBeenCalledWith(TEMP_DIR, {
      recursive: true,
      mode: DIR_MODE,
    });
  });
});
