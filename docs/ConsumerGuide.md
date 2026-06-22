# Code Container (`container`)

Repo: https://github.com/aerovato/container

This file contains instructions for AI coding assistants on how to setup and customize `container` on behalf of users.

Note: You are not allowed to run the `container` command as it will bring up an interactive Docker shell; you will thus get stuck as you won't be able to exit the shell. It is meant for user consumption only.

## Setup Instructions

If the user asks you to setup `container`, follow these steps.

### Pre-setup

- Read `./README.md`
- On Windows, `container` runs natively (no WSL required). See [Windows.md](/docs/Windows.md) for requirements and caveats.

### Setup

Do for the user, one step at a time.

1. Install `container` as NPM package:

   ```bash
   npm install -g @aerovato/container
   ```

2. **Check for migration** (V2 → V3):
   - Look inside `~/.code-container/archive/`; if the archive exists and there are archived files in here, ask the user: "Would you like to migrate your old V2 harness configs and settings into the new `container`?"
   - If the user agrees, read `docs/Migration.md` and follow the agent-assisted migration process described there.

3. Ask the user to run `container init`. This triggers interactive onboarding (Express or Custom mode). It handles:
   - Harness detection and selection
   - Tool detection and selection
   - Migrating existing harness and tool configs
   - Choosing container runtime (Docker or Podman)
   - SSH mount preferences

4. Build the Docker image (first time can take 5+ minutes):
   ```bash
   container build
   ```

## Storage Structure (V3)

All user data lives in `~/.code-container/`:

```
~/.code-container/
├── configs/              # Harness and tool configs (mounted into containers)
├── Dockerfile.User       # User packages and customizations
├── settings.json         # Primary configuration (harnesses, tools, runtime, dockerfileCore, flags, mounts)
└── temp/                 # Generated Dockerfiles + internal state (usually leave alone)
```

On upgrade from V2, old files (`MOUNTS.txt`, `DOCKER_FLAGS.txt`, `DOCKER_RUN_FLAGS.txt`, `Dockerfile.Packages`) are archived.

## Build Stages

`container` uses a 4-stage build:

1. **Core** — Generated from `settings.dockerfileCore` (base image, system packages, Node.js, etc.)
2. **Tools** — Generated from `settings.enabledTools` (installs selected development tools)
3. **Harness** — Generated from `settings.enabledHarnesses` (installs selected coding harnesses)
4. **User** — From `~/.code-container/Dockerfile.User`

Images are tagged under `localhost/aerovato/container-v3-*`.

Build targets:

- `full` (default) — Rebuild everything
- `tools` — Rebuild from Tools stage onward
- `harness` — Rebuild from Harness stage onward
- `user` — Rebuild User stage only (fastest for most customizations)

## Customization

### Adding Packages & Customizations

Edit `~/.code-container/Dockerfile.User`. The first line must be:

```dockerfile
FROM localhost/aerovato/container-v3-harness:latest
```

Example additions:

```dockerfile
# System packages
RUN apt-get update && apt-get install -y postgresql-client

# Global tools
RUN npm install -g bun
RUN pip install requests
```

After editing:

- `container build user` (recommended — fast)
- `container build` (full rebuild if needed)

For deeper control of the base environment (changing base image, default commands, adding packages before harnesses), edit the `dockerfileCore` object in `settings.json`.

### Other Settings

Most configuration lives in `~/.code-container/settings.json`. See [Settings.md](/docs/Settings.md) for the full list of supported keys, types, and examples.

Key settings include:

- `enabledHarnesses`
- `enabledTools`
- `runtime`
- `systemMounts`
- `dockerRunFlags` / `dockerExecFlags`
- `dockerfileCore` (advanced)

Edit this file directly. After changing `dockerfileCore`, `enabledHarnesses`, or `enabledTools`, run `container build` to rebuild the image.

## Common Commands

```bash
container                           # Enter container for current directory
container run /path/to/project      # Specific project
container run [/path] -- -p 8080:80 # With runtime flags (on create)
container create [/path]            # Create without attaching
container attach [/path]            # Attach to existing container
container build [full|tools|harness|user]
container init                      # Re-run onboarding / settings
container stop [path]
container remove [path]
container list
```

## Harness Permissions

If the user wants to configure harnesses to run without permission prompts inside `container`, follow the instructions in [Permissions.md](/docs/Permissions.md).

Note: Only modify files inside `~/.code-container/configs/`. Do not edit the main harness configs on the host after migration.
