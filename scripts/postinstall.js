#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");

const APPDATA_DIR = path.join(os.homedir(), ".code-container");
const CONFIGS_DIR = path.join(APPDATA_DIR, "configs");
const TEMP_DIR = path.join(APPDATA_DIR, "temp");
const ARCHIVE_DIR = path.join(APPDATA_DIR, "archive");
const SETTINGS_PATH = path.join(APPDATA_DIR, "settings.json");
const USER_DOCKERFILE_PATH = path.join(APPDATA_DIR, "Dockerfile.User");
const RESOURCES_DIR = path.join(__dirname, "..", "resources");
const PACKAGED_USER_DOCKERFILE = path.join(RESOURCES_DIR, "Dockerfile.User");

const CURRENT_MIGRATION_VERSION = 1;

function readSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  if (!fs.existsSync(APPDATA_DIR)) {
    fs.mkdirSync(APPDATA_DIR, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), {
    mode: 0o600,
  });
}

function moveIfExists(src, destDir) {
  if (fs.existsSync(src)) {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const basename = path.basename(src);
    fs.renameSync(src, path.join(destDir, basename));
  }
}

// --- Migration: undefined -> 1 (V2 -> V3) ---
function migrateV2ToV3(settings) {
  const MOUNTS_PATH = path.join(APPDATA_DIR, "MOUNTS.txt");
  const FLAGS_PATH = path.join(APPDATA_DIR, "DOCKER_FLAGS.txt");
  const RUN_FLAGS_PATH = path.join(APPDATA_DIR, "DOCKER_RUN_FLAGS.txt");
  const PACKAGES_DOCKERFILE_PATH = path.join(
    APPDATA_DIR,
    "Dockerfile.Packages",
  );

  // Archive old files
  moveIfExists(MOUNTS_PATH, ARCHIVE_DIR);
  moveIfExists(FLAGS_PATH, ARCHIVE_DIR);
  moveIfExists(RUN_FLAGS_PATH, ARCHIVE_DIR);
  moveIfExists(PACKAGES_DOCKERFILE_PATH, ARCHIVE_DIR);

  // Archive Dockerfile.User if it doesn't use the new base image
  if (fs.existsSync(USER_DOCKERFILE_PATH)) {
    const content = fs.readFileSync(USER_DOCKERFILE_PATH, "utf-8");
    const hasNewBase = content
      .split("\n")
      .some((line) =>
        line.trim().startsWith("FROM localhost/aerovato/container-v3-harness"),
      );
    if (!hasNewBase) {
      moveIfExists(USER_DOCKERFILE_PATH, ARCHIVE_DIR);
    }
  }

  // Remove old keys
  delete settings.completedInit;
  delete settings.acceptedTos;

  return settings;
}

// --- Migration chain ---
const MIGRATIONS = {
  1: migrateV2ToV3,
};

// --- Setup tasks (run on every install) ---
function setup() {
  if (!fs.existsSync(APPDATA_DIR)) {
    fs.mkdirSync(APPDATA_DIR, { recursive: true, mode: 0o700 });
  } else {
    fs.chmodSync(APPDATA_DIR, 0o700);
  }

  if (!fs.existsSync(CONFIGS_DIR)) {
    fs.mkdirSync(CONFIGS_DIR, { recursive: true, mode: 0o700 });
  } else {
    fs.chmodSync(CONFIGS_DIR, 0o700);
  }

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true, mode: 0o700 });
  }

  if (!fs.existsSync(USER_DOCKERFILE_PATH)) {
    fs.copyFileSync(PACKAGED_USER_DOCKERFILE, USER_DOCKERFILE_PATH);
  }
}

// --- Main ---
function main() {
  const settings = readSettings();
  const currentVersion = settings.migrationVersion || 0;

  if (currentVersion < CURRENT_MIGRATION_VERSION) {
    for (let v = currentVersion + 1; v <= CURRENT_MIGRATION_VERSION; v++) {
      const migrate = MIGRATIONS[v];
      if (migrate) {
        migrate(settings);
      }
    }

    settings.migrationVersion = CURRENT_MIGRATION_VERSION;
    writeSettings(settings);
  }

  setup();
}

main();
