import type { Platform } from "../../src/platform/os";

// Run `fn` with `process.platform` overridden to `platform`, restoring the
// original value afterwards. `os.ts:getPlatform()` reads `process.platform`
// directly, so this cascades to every `isWindows()`/`isLinux()`/`isMacos()`
// caller under test.
export function withPlatform<T>(platform: Platform, fn: () => T): T {
  const original = process.platform;
  Object.defineProperty(process, "platform", { value: platform });
  try {
    return fn();
  } finally {
    Object.defineProperty(process, "platform", { value: original });
  }
}
