import path from "path";
import { Filesystem } from "./platform/fs";
import {
  APPDATA_DIR,
  ARCHIVE_DIR,
  CONFIGS_DIR,
  SETTINGS_PATH,
  TEMP_DIR,
  USER_DOCKERFILE_PATH,
} from "./platform/paths";

const CURRENT_MIGRATION_VERSION = 1;

export const USER_DOCKERFILE_TEMPLATE = `# User customizations for container
# Add your RUN, ENV, COPY, etc. directives below.
FROM localhost/aerovato/container-v3-harness:latest
LABEL aerovato.container=v3
`;

type RawSettings = Record<string, unknown>;

function readRawSettings(fs: Filesystem): RawSettings | null {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return {};
  }

  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8") as string);
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeRawSettings(fs: Filesystem, settings: RawSettings): void {
  fs.ensureAppdataDir();
  fs.secureWriteFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

function moveIfExists(fs: Filesystem, source: string): void {
  if (!fs.existsSync(source)) {
    return;
  }

  fs.secureMkdir(ARCHIVE_DIR);
  fs.renameSync(source, path.join(ARCHIVE_DIR, path.basename(source)));
}

function migrateV2ToV3(fs: Filesystem, settings: RawSettings): void {
  moveIfExists(fs, path.join(APPDATA_DIR, "MOUNTS.txt"));
  moveIfExists(fs, path.join(APPDATA_DIR, "DOCKER_FLAGS.txt"));
  moveIfExists(fs, path.join(APPDATA_DIR, "DOCKER_RUN_FLAGS.txt"));
  moveIfExists(fs, path.join(APPDATA_DIR, "Dockerfile.Packages"));

  if (fs.existsSync(USER_DOCKERFILE_PATH)) {
    const content = fs.readFileSync(USER_DOCKERFILE_PATH, "utf-8") as string;
    const hasNewBase = content
      .split("\n")
      .some(line =>
        line.trim().startsWith("FROM localhost/aerovato/container-v3-harness"),
      );
    if (!hasNewBase) {
      moveIfExists(fs, USER_DOCKERFILE_PATH);
    }
  }

  delete settings.completedInit;
  delete settings.acceptedTos;
}

export function runMigration(fs: Filesystem): void {
  const settings = readRawSettings(fs);
  if (settings === null) {
    return;
  }

  const currentVersion = Number(settings.migrationVersion || 0);
  if (currentVersion >= CURRENT_MIGRATION_VERSION) {
    return;
  }

  for (
    let version = currentVersion + 1;
    version <= CURRENT_MIGRATION_VERSION;
    version++
  ) {
    if (version === 1) {
      migrateV2ToV3(fs, settings);
    }
  }

  settings.migrationVersion = CURRENT_MIGRATION_VERSION;
  writeRawSettings(fs, settings);
}

export function runSetup(fs: Filesystem): void {
  fs.secureMkdir(APPDATA_DIR);
  fs.secureMkdir(CONFIGS_DIR);
  fs.secureMkdir(TEMP_DIR);

  if (!fs.existsSync(USER_DOCKERFILE_PATH)) {
    fs.secureWriteFile(USER_DOCKERFILE_PATH, USER_DOCKERFILE_TEMPLATE);
  }
}
