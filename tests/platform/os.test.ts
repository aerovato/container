import { describe, it, expect } from "vitest";
import {
  Platform,
  getPlatform,
  isWindows,
  isLinux,
  isMacos,
} from "../../src/platform/os";
import { withPlatform } from "./helpers";

describe("Platform enum", () => {
  it("maps to node's platform strings", () => {
    expect(Platform.Windows).toBe("win32");
    expect(Platform.Linux).toBe("linux");
    expect(Platform.Macos).toBe("darwin");
  });
});

describe("getPlatform", () => {
  it("returns Windows for win32", () => {
    withPlatform(Platform.Windows, () => {
      expect(getPlatform()).toBe(Platform.Windows);
    });
  });

  it("returns Linux for linux", () => {
    withPlatform(Platform.Linux, () => {
      expect(getPlatform()).toBe(Platform.Linux);
    });
  });

  it("returns Macos for darwin", () => {
    withPlatform(Platform.Macos, () => {
      expect(getPlatform()).toBe(Platform.Macos);
    });
  });

  it("falls back to Linux for unknown platforms", () => {
    withPlatform("freebsd" as Platform, () => {
      expect(getPlatform()).toBe(Platform.Linux);
    });
  });
});

describe("platform predicates", () => {
  it("isWindows is true only on win32", () => {
    withPlatform(Platform.Windows, () => expect(isWindows()).toBe(true));
    withPlatform(Platform.Linux, () => expect(isWindows()).toBe(false));
    withPlatform(Platform.Macos, () => expect(isWindows()).toBe(false));
  });

  it("isLinux is true only on linux", () => {
    withPlatform(Platform.Linux, () => expect(isLinux()).toBe(true));
    withPlatform(Platform.Windows, () => expect(isLinux()).toBe(false));
    withPlatform(Platform.Macos, () => expect(isLinux()).toBe(false));
  });

  it("isMacos is true only on darwin", () => {
    withPlatform(Platform.Macos, () => expect(isMacos()).toBe(true));
    withPlatform(Platform.Windows, () => expect(isMacos()).toBe(false));
    withPlatform(Platform.Linux, () => expect(isMacos()).toBe(false));
  });

  it("predicates are mutually exclusive per platform", () => {
    for (const p of [Platform.Windows, Platform.Linux, Platform.Macos]) {
      withPlatform(p, () => {
        const truthy = [isWindows(), isLinux(), isMacos()].filter(Boolean);
        expect(truthy).toHaveLength(1);
      });
    }
  });
});
