import path from "path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fs, vol } from "memfs";
import {
  APPDATA_DIR,
  ARCHIVE_DIR,
  CONFIGS_DIR,
  SETTINGS_PATH,
  TEMP_DIR,
  USER_DOCKERFILE_PATH,
} from "../src/platform/paths";
import { FsReader, Filesystem } from "../src/platform/fs";
import { runMigration, runSetup, USER_DOCKERFILE_TEMPLATE } from "../src/setup";

const fsReader = new Filesystem(fs as unknown as FsReader);

vi.mock("fs");

beforeEach(() => {
  vol.reset();
});

describe("runSetup", () => {
  it("creates runtime directories and seeds Dockerfile.User", () => {
    runSetup(fsReader);

    expect(fs.existsSync(APPDATA_DIR)).toBe(true);
    expect(fs.existsSync(CONFIGS_DIR)).toBe(true);
    expect(fs.existsSync(TEMP_DIR)).toBe(true);
    expect(fs.readFileSync(USER_DOCKERFILE_PATH, "utf-8")).toBe(
      USER_DOCKERFILE_TEMPLATE,
    );
  });

  it("does not overwrite an existing Dockerfile.User", () => {
    fs.mkdirSync(APPDATA_DIR, { recursive: true });
    fs.writeFileSync(USER_DOCKERFILE_PATH, "FROM custom\n");

    runSetup(fsReader);

    expect(fs.readFileSync(USER_DOCKERFILE_PATH, "utf-8")).toBe(
      "FROM custom\n",
    );
  });
});

describe("runMigration", () => {
  it("archives V2 files, removes old keys, and records migration version", () => {
    fs.mkdirSync(APPDATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(APPDATA_DIR, "MOUNTS.txt"), "mounts");
    fs.writeFileSync(path.join(APPDATA_DIR, "DOCKER_FLAGS.txt"), "flags");
    fs.writeFileSync(
      path.join(APPDATA_DIR, "DOCKER_RUN_FLAGS.txt"),
      "run flags",
    );
    fs.writeFileSync(path.join(APPDATA_DIR, "Dockerfile.Packages"), "packages");
    fs.writeFileSync(USER_DOCKERFILE_PATH, "FROM node:20\n");
    fs.writeFileSync(
      SETTINGS_PATH,
      JSON.stringify({
        completedInit: true,
        acceptedTos: true,
        runtime: "docker",
      }),
    );

    runMigration(fsReader);

    expect(fs.existsSync(path.join(ARCHIVE_DIR, "MOUNTS.txt"))).toBe(true);
    expect(fs.existsSync(path.join(ARCHIVE_DIR, "DOCKER_FLAGS.txt"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(ARCHIVE_DIR, "DOCKER_RUN_FLAGS.txt"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(ARCHIVE_DIR, "Dockerfile.Packages"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(ARCHIVE_DIR, "Dockerfile.User"))).toBe(true);

    const settings = JSON.parse(
      fs.readFileSync(SETTINGS_PATH, "utf-8") as string,
    );
    expect(settings).toEqual({ runtime: "docker", migrationVersion: 1 });
  });

  it("keeps Dockerfile.User when it already uses the V3 harness base", () => {
    fs.mkdirSync(APPDATA_DIR, { recursive: true });
    fs.writeFileSync(
      USER_DOCKERFILE_PATH,
      "FROM localhost/aerovato/container-v3-harness:latest\n",
    );

    runMigration(fsReader);

    expect(fs.existsSync(USER_DOCKERFILE_PATH)).toBe(true);
    expect(fs.existsSync(path.join(ARCHIVE_DIR, "Dockerfile.User"))).toBe(
      false,
    );
  });

  it("does not overwrite invalid settings JSON", () => {
    fs.mkdirSync(APPDATA_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, "not json");

    runMigration(fsReader);

    expect(fs.readFileSync(SETTINGS_PATH, "utf-8")).toBe("not json");
  });
});
