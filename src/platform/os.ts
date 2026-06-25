export enum Platform {
  Windows = "win32",
  Linux = "linux",
  Macos = "darwin",
}

export type PlatformArch = "x64" | "arm64";

export function getPlatform(): Platform {
  const p = process.platform;
  if (p === "win32") return Platform.Windows;
  if (p === "darwin") return Platform.Macos;
  return Platform.Linux;
}

export function isWindows(): boolean {
  return getPlatform() === Platform.Windows;
}

export function isLinux(): boolean {
  return getPlatform() === Platform.Linux;
}

export function isMacos(): boolean {
  return getPlatform() === Platform.Macos;
}

export function getPlatformArch(): PlatformArch | undefined {
  if (process.arch === "x64") return "x64";
  if (process.arch === "arm64") return "arm64";
  return undefined;
}
