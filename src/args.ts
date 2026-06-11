import * as clack from "@clack/prompts";
import { BuildTarget } from "./types";

const BUILD_TARGETS: BuildTarget[] = ["full", "harness", "user"];

export type ParsedArgs =
  | { command: "run"; target: string | undefined; cliFlags: string[] }
  | { command: "build"; target: BuildTarget }
  | { command: "init" }
  | { command: "settings" }
  | { command: "stop"; target: string | undefined }
  | { command: "remove"; target: string | undefined }
  | { command: "list" };

function usage(): never {
  console.log(`
 Usage: container [COMMAND] [PROJECT_PATH] [-- DOCKER_FLAGS...]

Manage isolated containers for running coding tools on different projects.

Commands:
    (none)              Start container for current directory (default)
    run                 Start container for specified project or container
    build [TARGET]      Build the Docker image (default: full)
    init                Trigger onboarding
    stop                Stop the container for this project
    remove              Remove the container for this project
    list                List all containers

Build targets:
    full                Build all stages: Core -> Harness -> User
    harness             Rebuild from Harness stage onward
    user                Build User stage only

Arguments:
    PROJECT_PATH        Path to the project directory (defaults to current directory)
    DOCKER_FLAGS        Additional flags passed to the runtime after '--'

Examples:
    container                              # Start container for current directory
    container run /path/to/project         # Start container for specific project
    container run /path -- -p 8080:80      # Pass runtime flags for port mapping
    container run -- -e FOO=bar            # Pass env vars (uses current directory)
    container build                        # Build all stages from scratch
    container build full                   # Build all stages from scratch
    container build harness                # Rebuild from Harness stage
    container build user                   # Build User stage only
    container settings                     # Modify settings interactively
    container init                         # Trigger onboarding
    container stop                         # Stop container for current directory
    container remove /path/to/project      # Remove container for specific project
    container list                         # List all containers
`);
  process.exit(0);
}

function fatal(msg: string[]): never {
  msg.forEach(m => clack.log.error(m));
  process.exit(1);
}

const VALID_COMMANDS = [
  "run",
  "build",
  "init",
  "settings",
  "stop",
  "remove",
  "list",
];

function splitAtSeparator(args: string[]): {
  before: string[];
  after: string[];
} {
  const idx = args.indexOf("--");
  if (idx === -1) {
    return { before: args, after: [] };
  }
  return { before: args.slice(0, idx), after: args.slice(idx + 1) };
}

export function parseArgs(raw: string[]): ParsedArgs {
  if (raw.length === 0) {
    return { command: "run", target: undefined, cliFlags: [] };
  }

  const first = raw[0];
  if (first === "help" || first === "--help" || first === "-h") {
    usage();
  }

  if (!VALID_COMMANDS.includes(first)) {
    fatal([`Unknown command: ${first}`]);
  }

  const command = first as (typeof VALID_COMMANDS)[number];
  const remaining = raw.slice(1);

  switch (command) {
    case "build": {
      const target = remaining[0] || "full";
      if (!BUILD_TARGETS.includes(target as BuildTarget)) {
        fatal([
          `Unknown build target: ${target}`,
          `Available targets: ${BUILD_TARGETS.join(", ")}`,
        ]);
      }
      return { command: "build", target: target as BuildTarget };
    }
    case "list":
    case "init":
    case "settings": {
      if (remaining.length > 0) {
        fatal([`Unexpected argument: ${remaining[0]}`]);
      }
      return { command } as ParsedArgs;
    }
    case "run": {
      const { before, after } = splitAtSeparator(remaining);
      if (before.length > 1) {
        fatal([`Unexpected argument: ${before[1]}`]);
      }
      return {
        command: "run",
        target: before[0] || undefined,
        cliFlags: after,
      };
    }
    case "stop":
    case "remove": {
      if (remaining.length > 1) {
        fatal([`Unexpected argument: ${remaining[1]}`]);
      }
      return {
        command: command as "stop" | "remove",
        target: remaining[0] || undefined,
      };
    }
  }

  return fatal(["Unreachable"]);
}
