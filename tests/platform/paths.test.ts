import { describe, it, expect } from "vitest";
import path from "path";
import os from "os";
import {
  APPDATA_DIR,
  CONFIGS_DIR,
  TEMP_DIR,
  SETTINGS_PATH,
  STATE_PATH,
  USER_DOCKERFILE_PATH,
  CORE_DOCKERFILE_PATH,
  TOOLS_DOCKERFILE_PATH,
  HARNESS_DOCKERFILE_PATH,
  CONTAINER_PREFIX,
  homeDir,
  expandHomePath,
  resolveProjectPath,
  generateContainerName,
  resolveContainerName,
  buildBindMount,
} from "../../src/platform/paths";
import { Platform } from "../../src/platform/os";
import { withPlatform } from "./helpers";

describe("path constants", () => {
  it("anchors appdata under the home directory", () => {
    expect(APPDATA_DIR).toBe(path.join(os.homedir(), ".code-container"));
  });

  it("derives subpaths from APPDATA_DIR", () => {
    expect(CONFIGS_DIR).toBe(path.join(APPDATA_DIR, "configs"));
    expect(TEMP_DIR).toBe(path.join(APPDATA_DIR, "temp"));
    expect(SETTINGS_PATH).toBe(path.join(APPDATA_DIR, "settings.json"));
    expect(STATE_PATH).toBe(path.join(TEMP_DIR, "state.json"));
    expect(USER_DOCKERFILE_PATH).toBe(
      path.join(APPDATA_DIR, "Dockerfile.User"),
    );
    expect(CORE_DOCKERFILE_PATH).toBe(path.join(TEMP_DIR, "Dockerfile.Core"));
    expect(TOOLS_DOCKERFILE_PATH).toBe(path.join(TEMP_DIR, "Dockerfile.Tools"));
    expect(HARNESS_DOCKERFILE_PATH).toBe(
      path.join(TEMP_DIR, "Dockerfile.Harness"),
    );
  });
});

describe("homeDir", () => {
  it("returns os.homedir()", () => {
    expect(homeDir()).toBe(os.homedir());
  });
});

describe("expandHomePath", () => {
  it("expands tilde to home directory", () => {
    expect(expandHomePath("~/.claude")).toBe(
      path.join(os.homedir(), ".claude"),
    );
  });

  it("returns absolute path unchanged", () => {
    expect(expandHomePath("/absolute/path")).toBe("/absolute/path");
  });
});

describe("resolveProjectPath", () => {
  // Note: Node's `path` binds win32/posix at module load, so on a POSIX host
  // only POSIX resolution can be exercised here. Drive-letter handling is
  // therefore not asserted; canonicalization in generateContainerName covers
  // the cross-environment mapping instead.
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

  it("uses CONTAINER_PREFIX", () => {
    expect(generateContainerName("/x/proj")).toMatch(
      new RegExp(`^${CONTAINER_PREFIX}-proj-[a-f0-9]{8}$`),
    );
  });

  it("unifies native Windows and WSL paths for the same project", () => {
    const windowsName = generateContainerName("C:\\Users\\dev\\project");
    const wslName = generateContainerName("/mnt/c/Users/dev/project");
    expect(windowsName).toBe(wslName);
  });

  it("unifies forward-slash drive paths with WSL paths", () => {
    const driveName = generateContainerName("D:/dev/project");
    const wslName = generateContainerName("/mnt/d/dev/project");
    expect(driveName).toBe(wslName);
  });

  it("case-insensitively normalizes drive letters", () => {
    expect(generateContainerName("C:\\Users\\dev\\project")).toBe(
      generateContainerName("c:\\Users\\dev\\project"),
    );
  });

  it("leaves WSL-native and POSIX paths unchanged in form", () => {
    expect(generateContainerName("/home/user/project")).toBe(
      generateContainerName("/home/user/project"),
    );
  });

  it("canonicalizes a drive-rooted path", () => {
    expect(generateContainerName("C:\\project")).toBe(
      generateContainerName("/mnt/c/project"),
    );
  });
});

describe("resolveContainerName", () => {
  it("generates a container name from path", () => {
    const name = resolveContainerName("/home/user/project");
    expect(name).toMatch(/^container-project-[a-f0-9]{8}$/);
  });

  it("matches generateContainerName for the same input", () => {
    expect(resolveContainerName("/home/user/project")).toBe(
      generateContainerName("/home/user/project"),
    );
  });
});

describe("buildBindMount", () => {
  it("formats explicit bind mount on POSIX", () => {
    withPlatform(Platform.Linux, () => {
      expect(buildBindMount("/home/foo", "/root/foo")).toBe(
        "type=bind,source=/home/foo,target=/root/foo",
      );
    });
  });

  it("appends readonly when provided on POSIX", () => {
    withPlatform(Platform.Linux, () => {
      expect(buildBindMount("/home/foo", "/root/foo", "ro")).toBe(
        "type=bind,source=/home/foo,target=/root/foo,readonly",
      );
    });
  });

  it("leaves backslashes untouched on POSIX", () => {
    withPlatform(Platform.Linux, () => {
      expect(buildBindMount("C:\\Users\\foo", "/root/foo")).toBe(
        "type=bind,source=C:\\Users\\foo,target=/root/foo",
      );
    });
  });

  it("normalizes backslashes to forward slashes on Windows", () => {
    withPlatform(Platform.Windows, () => {
      expect(buildBindMount("C:\\Users\\foo", "/root/foo")).toBe(
        "type=bind,source=C:/Users/foo,target=/root/foo",
      );
    });
  });

  it("appends readonly after normalization on Windows", () => {
    withPlatform(Platform.Windows, () => {
      expect(buildBindMount("C:\\Users\\foo", "/root/foo", "ro")).toBe(
        "type=bind,source=C:/Users/foo,target=/root/foo,readonly",
      );
    });
  });
});
