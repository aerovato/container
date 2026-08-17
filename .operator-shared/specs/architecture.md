# Architecture

### Storage Structure

All user data stored in `~/.code-container/`:

```
~/.code-container/
├── configs/              # Harness configs (mounted to containers)
├── archive/              # Archived V2 files (MOUNTS.txt, DOCKER_*.txt, old Dockerfiles)
├── Dockerfile.User       # User customizations (FROM localhost/aerovato/container-v3-harness)
├── temp/                 # Generated Dockerfiles + ephemeral state
│   ├── Dockerfile.Core
│   ├── Dockerfile.Tools
│   ├── Dockerfile.Harness
│   └── state.json        # buildDirty, lastUpgradeTime
└── settings.json         # Internal settings (new V3 keys only)
```

Settings drive generation of Dockerfiles in `temp/`. `configs/` holds harness and tool pack configuration files mounted into containers at runtime. `Dockerfile.User` is the sole user-owned file and applies the final customization layer. `temp/state.json` records ephemeral state including the build dirty flag and last successful upgrade timestamp. See `configuration.md`.

### CLI Commands

- `container [path]` — Run container for project (defaults to run).
- `container run [path] [-- DOCKER_FLAGS]` — Create (if needed) and attach; flags route to `docker run` on create, `docker exec` on attach (see `commands/run.ts`).
- `container create [path] [-- DOCKER_FLAGS]` — Create container without attaching; flags to `docker run` (see `commands/create.ts`).
- `container attach [path] [-- DOCKER_FLAGS]` — Attach to existing container without creating; flags to `docker exec` (see `commands/attach.ts`).
- `container build [TARGET]` — Build image (see `commands/build.ts`, `docker.ts:buildImage`). Targets: full/tools/harness/user. Default: full.
- `container init` — Trigger onboarding (see `onboarding.ts`).
- `container settings` — Interactive settings menu (see `commands/settings.ts`).
- `container stop [path]` — Stop container (see `commands/stop.ts`).
- `container remove [path]` — Remove container (see `commands/remove.ts`).
- `container list` — List containers (see `commands/list.ts`).

Shared target resolution (`resolveTarget`) and image pre-flight (`ensureImageReady`) live in `commands/shared.ts`.

`clean` removed in V3.

### Build System

Four-stage pipeline (images under `localhost/aerovato/container-v3-*`):

1. Core (from `settings.json:dockerfileCore` + defaults) → `...-core:latest`
2. Tools (enabled tool packs) → `...-tools:latest`
3. Harness (enabled harness packs) → `...-harness:latest`
4. User (`Dockerfile.User`) → `...:latest`

`Dockerfile.Core`, `Dockerfile.Tools`, and `Dockerfile.Harness` are generated to `temp/` on build. Post-build prunes unused images.

Dirty levels (in `state.json:buildDirty`): `core`, `tools`, `harness` (or unset).

- `dockerfileCore` change → dirty at core.
- Enabled tools change → dirty at tools.
- Enabled harnesses change → dirty at harness.

Targets and clearing behavior:

- `full` — Rebuilds Core onward; clears any dirty state.
- `tools` — Rebuilds Tools onward; clears if dirty is `tools` or `harness`.
- `harness` — Rebuilds Harness onward; clears only if `harness`.
- `user` — Rebuilds only User; no effect on dirty.

Default: `full`. See `build.md` and `tool-packs.md`.

### Container Lifecycle

`container run` (default command) resolves the project path then: attaches if a container is already running, starts and attaches if stopped, or creates a new container from the current image and starts an interactive session. `container create` and `container attach` perform the create and attach halves independently.

The last active session for a container triggers stop via `stopContainerIfLastSession`, which checks `ContainerClient.attachedSessionCount` — counting `bash` processes via `docker top` (host-OS-independent). Orphan containers (from killed terminals or crashes) are swept on CLI startup via `stopOrphanedContainers`.

See `commands/run.ts` and `container.ts`.

### Mount Model

Mounts are assembled on container creation in `container.ts`.

- Harness pack and tool pack config mounts: files from `~/.code-container/configs/` are bind-mounted to the paths declared by the enabled packs.
- `systemMounts` (from settings): optional read-only mounts for `~/.gitconfig` (default true) and `~/.ssh` (default false).

See `tool-packs.md` and `configuration.md`.

### Platform Abstraction

All OS-dependent code is isolated in `src/platform/`: platform detection (`os.ts`), host paths and bind-mount construction incl. Windows drive-letter normalization (`paths.ts`), the filesystem wrapper with platform-aware permission modes (`fs.ts`), and host-shell concerns — `Executor`, `commandExists` (where/which), and runtime availability/default detection (`shell.ts`). An ESLint rule forbids `os`/`child_process`/`fs` imports and `process.platform`/`process.arch` access outside `src/platform/` (escape via `eslint-disable`). This is what enables native Windows (win32 + Docker Desktop) alongside macOS/Linux.

### Container Client

Docker/Podman operations go through a platform-independent `ContainerClient` instance. It takes an injected `Executor` (over `spawnSync`) and the binary name (`docker` or `podman`); the preference is read from `settings.json:runtime` (auto-detected if absent). This keeps engine choice configurable and enables full test isolation. See `container-client.ts` and `platform/shell.ts`.

### Restrictions

**DO NOT run the gorelease workflow or bun compile; you are inside a devcontainer and it will not work.**
