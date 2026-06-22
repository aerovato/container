import { Result, RuntimeBin } from "./types";

export interface SpawnSyncResult {
  status: number | null;
  stdout: string | Buffer;
  stderr: string | Buffer;
}

export interface Executor {
  spawnSync(bin: string, args: string[], options?: object): SpawnSyncResult;
}

export class Runtime {
  constructor(
    private executor: Executor,
    private bin: RuntimeBin,
  ) {}

  imageExists(name: string): boolean {
    const result = this.executor.spawnSync(
      this.bin,
      ["image", "inspect", name],
      { stdio: "pipe" },
    );
    return result.status === 0;
  }

  containerExists(name: string): boolean {
    const result = this.executor.spawnSync(
      this.bin,
      ["container", "inspect", name],
      { stdio: "pipe" },
    );
    return result.status === 0;
  }

  containerRunning(name: string): boolean {
    const result = this.executor.spawnSync(
      this.bin,
      ["container", "inspect", "-f", "{{.State.Running}}", name],
      { stdio: "pipe" },
    );
    return result.status === 0 && result.stdout.toString().trim() === "true";
  }

  build(dockerfilePath: string, tag: string, context: string): Result<void> {
    const result = this.executor.spawnSync(
      this.bin,
      ["build", "--no-cache", "-t", tag, "-f", dockerfilePath, context],
      { stdio: "inherit" },
    );
    if (result.status !== 0) {
      return { ok: false, error: "command_failed" };
    }
    return { ok: true, value: undefined };
  }

  run(args: string[]): Result<void> {
    const result = this.executor.spawnSync(this.bin, ["run", ...args], {
      stdio: "inherit",
    });
    if (result.status !== 0) {
      return { ok: false, error: "command_failed" };
    }
    return { ok: true, value: undefined };
  }

  exec(args: string[]): Result<void> {
    const result = this.executor.spawnSync(this.bin, ["exec", ...args], {
      stdio: "inherit",
    });
    if (result.status !== 0) {
      return { ok: false, error: "command_failed" };
    }
    return { ok: true, value: undefined };
  }

  start(name: string): void {
    this.executor.spawnSync(this.bin, ["start", name], { stdio: "inherit" });
  }

  stop(name: string): void {
    this.executor.spawnSync(this.bin, ["stop", "-t", "3", name], {
      stdio: "inherit",
    });
  }

  remove(name: string): void {
    this.executor.spawnSync(this.bin, ["rm", name], { stdio: "inherit" });
  }

  listContainers(filter: string, format: string): void {
    this.executor.spawnSync(
      this.bin,
      ["ps", "-a", "--filter", filter, "--format", format],
      { stdio: "inherit" },
    );
  }

  listRunningManagedContainers(): string[] {
    const result = this.executor.spawnSync(
      this.bin,
      [
        "ps",
        "--filter",
        "name=container-",
        "--filter",
        "status=running",
        "--format",
        "{{.Names}}",
      ],
      { stdio: "pipe" },
    );
    if (result.status !== 0) return [];
    return result.stdout.toString().trim().split("\n").filter(Boolean);
  }

  containerStartedAt(name: string): string | null {
    const result = this.executor.spawnSync(
      this.bin,
      ["inspect", "-f", "{{.State.StartedAt}}", name],
      { stdio: "pipe" },
    );
    if (result.status !== 0) return null;
    return result.stdout.toString().trim();
  }

  pruneImages(referenceFilter: string): void {
    this.executor.spawnSync(
      this.bin,
      ["image", "prune", "--force", "--filter", referenceFilter],
      { stdio: "inherit" },
    );
  }

  isAvailable(): boolean {
    const result = this.executor.spawnSync(this.bin, ["--version"], {
      stdio: "pipe",
    });
    return result.status === 0;
  }

  daemonRunning(): boolean {
    const result = this.executor.spawnSync(this.bin, ["info"], {
      stdio: "pipe",
    });
    return result.status === 0;
  }

  commandExists(cmd: string): boolean {
    const bin = process.platform === "win32" ? "where" : "which";
    const result = this.executor.spawnSync(bin, [cmd], { stdio: "pipe" });
    return result.status === 0;
  }
}
