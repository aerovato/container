import type fs from "fs";
import { isWindows } from "./os";
import { APPDATA_DIR, CONFIGS_DIR, TEMP_DIR } from "./paths";

export type FsReader = Pick<
  typeof fs,
  | "existsSync"
  | "readFileSync"
  | "writeFileSync"
  | "mkdirSync"
  | "chmodSync"
  | "statSync"
  | "readdirSync"
  | "cpSync"
  | "renameSync"
>;

const FILE_MODE = 0o600;
const DIR_MODE = 0o700;

export class Filesystem implements FsReader {
  readonly existsSync: FsReader["existsSync"];
  readonly readFileSync: FsReader["readFileSync"];
  readonly writeFileSync: FsReader["writeFileSync"];
  readonly mkdirSync: FsReader["mkdirSync"];
  readonly chmodSync: FsReader["chmodSync"];
  readonly statSync: FsReader["statSync"];
  readonly readdirSync: FsReader["readdirSync"];
  readonly cpSync: FsReader["cpSync"];
  readonly renameSync: FsReader["renameSync"];

  constructor(private readonly raw: FsReader) {
    this.existsSync = raw.existsSync.bind(raw);
    this.readFileSync = raw.readFileSync.bind(raw);
    this.writeFileSync = raw.writeFileSync.bind(raw);
    this.mkdirSync = raw.mkdirSync.bind(raw);
    this.chmodSync = raw.chmodSync.bind(raw);
    this.statSync = raw.statSync.bind(raw);
    this.readdirSync = raw.readdirSync.bind(raw);
    this.cpSync = raw.cpSync.bind(raw);
    this.renameSync = raw.renameSync.bind(raw);
  }

  secureMkdir(dirPath: string): void {
    if (isWindows()) {
      this.raw.mkdirSync(dirPath, { recursive: true });
      return;
    }
    this.raw.mkdirSync(dirPath, { recursive: true, mode: DIR_MODE });
    this.raw.chmodSync(dirPath, DIR_MODE);
  }

  secureWriteFile(filePath: string, content: string): void {
    if (isWindows()) {
      this.raw.writeFileSync(filePath, content);
      return;
    }
    this.raw.writeFileSync(filePath, content, { mode: FILE_MODE });
  }

  ensureAppdataDir(): void {
    if (!this.raw.existsSync(APPDATA_DIR)) {
      this.secureMkdir(APPDATA_DIR);
    } else if (!isWindows()) {
      this.raw.chmodSync(APPDATA_DIR, DIR_MODE);
    }
  }

  ensureConfigDir(): void {
    this.ensureAppdataDir();
    if (!this.raw.existsSync(CONFIGS_DIR)) {
      this.secureMkdir(CONFIGS_DIR);
    } else if (!isWindows()) {
      this.raw.chmodSync(CONFIGS_DIR, DIR_MODE);
    }
  }

  ensureTempDir(): void {
    this.ensureAppdataDir();
    if (!this.raw.existsSync(TEMP_DIR)) {
      this.secureMkdir(TEMP_DIR);
    }
  }
}
