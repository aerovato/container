---
description: Main shared codebase map for the `container` project; lists all code files and directories with short descriptions.
read_if: Before navigating or searching the codebase; before deciding where new code belongs.
---

# Shared Project Index

## Architecture

- `container` is a TypeScript CLI that manages isolated Docker/Podman project environments via a four-stage image build pipeline (Core, Tools, Harness, User).
- All OS-dependent code lives in `src/platform/`; an ESLint rule forbids `os`/`child_process`/`fs` imports and `process.platform`/`process.arch` access elsewhere.
- Host CLI never calls docker/podman directly; it goes through `ContainerClient` with an injected `Executor`.
- Update this index every time you create or significantly modify a file. Split large sections into subindexes in this directory and record them below.

## Subindexes

- None yet.

## Project Index

### Directory Structure

- `src/` — TypeScript source code (main codebase)
- `resources/` — Packaged Dockerfiles (only User template)
- `scripts/` — Utility scripts (version generation, precommit, release)
- `website/` — Astro + Tailwind single-page marketing website
- `skills/` — Portable Agent Skills and their references
- `tests/` — Test files (Vitest)
- `__mocks__/` — Module mocks for testing (fs only)
- `dist/` — Compiled JavaScript output (generated)
- `package.json` — Ditto
- `tsconfig.json` — Ditto

### `src/` — TypeScript source code (main codebase)

#### Entry Point

- `src/main.ts` — CLI entry. Runs runtime setup/migration, handles version, ensures TOS + onboarding, routes runtime-independent commands, auto-detects runtime, and starts the backend when needed.

#### Core Modules

- `src/args.ts` — Argument parsing for all commands, targets, `--version`, and `--` flag separation.
- `src/commands/build.ts` — Build command entry (wraps `docker.ts:buildImage`).
- `src/commands/upgrade.ts` — Upgrade command; skips when current, updates npm installs via npm and standalone installs by invoking the hosted installer scripts; records successful upgrade time.
- `src/commands/run.ts` — Run command; orchestrates create-if-missing + attach with contextual flag routing.
- `src/commands/create.ts` — Create command; creates container without attaching. Exports `createContainer` helper (used by `run.ts`).
- `src/commands/attach.ts` — Attach command; attaches to existing container without creating. Exports `attachToContainer` helper (used by `run.ts`).
- `src/commands/stop.ts` — Stop command.
- `src/commands/remove.ts` — Remove command.
- `src/commands/list.ts` — List command.
- `src/commands/settings.ts` — Interactive settings menu (harnesses, tools, runtime, mounts) with rebuild prompt.
- `src/commands/shared.ts` — Target resolution (`resolveTarget`), `ensureImageReady`, `getBuildDirty`.
- `src/container.ts` — Mount generation (harness + tool packs, deduplicates shared harness mounts), create/exec, last-session stop (`stopContainerIfLastSession`), orphan sweep (`stopOrphanedContainers`). Session counting delegates to `ContainerClient.attachedSessionCount`.
- `src/docker.ts` — `buildImage` (4-stage + dirty clearing + prune), image/tag constants.
- `src/dockerfile-core.ts` — Core defaults, resolve, `generateDockerfileCore`, image constants.
- `src/dockerfile-tools.ts` — `generateDockerfileTools` from enabled tool packs.
- `src/dockerfile-harness.ts` — `generateDockerfileHarness` from enabled harness packs.
- `src/harness-packs.ts` — `HARNESS_PACKS` definitions with install commands and typed config mounts; OpenCode V2 is default, V1 is manually selectable.
- `src/tool-packs.ts` — `TOOL_PACKS` definitions with install commands and typed config mounts.
- `src/container-client.ts` — `ContainerClient` class (wraps docker/podman via injected `Executor`); all container/image lifecycle ops incl. `attachedSessionCount` (session count via `docker top`, host-OS-independent).
- `src/types.ts` — Zod schemas and shared types (Settings, State, DockerfileCoreConfig, HarnessPack, ToolPack, discriminated ConfigMount), `Result<T>`.
- `src/config.ts` — `SettingsStore`/`StateStore` (Result-based, Zod) plus shared config mount source preparation (`ensureConfigExists`).
- `src/onboarding.ts` — `needsOnboarding`, `runOnboarding` (express/custom with clack, runtime installation guidance and readiness, harness detect/migrate, config source preparation, tool select, runtime select).
- `src/tos.ts` — `ensureTosAccepted` (versioned TOS + clack).
- `src/update-check.ts` — Async GitHub Releases version check; skips within one day of a recorded successful upgrade, returns info or null.
- `src/setup.ts` — Runtime install setup and migrations: creates app dirs, seeds embedded Dockerfile.User, and archives old V2 files.

#### `src/platform/` — Platform module (all OS-dependent code)

- `src/platform/os.ts` — Platform detection: `Platform` enum, architecture detection, `getPlatform`, `isWindows`/`isLinux`/`isMacos`.
- `src/platform/paths.ts` — All host path/name utilities: app-data/install + dockerfile path constants, `homeDir`, `expandHomePath`, `resolveProjectPath`, `generateContainerName`, `resolveContainerName`, `buildBindMount` (normalizes backslashes for Windows drive letters).
- `src/platform/fs.ts` — `Filesystem` class (wraps injected `FsReader`): re-exposes fs ops + platform-aware `secureMkdir`/`secureWriteFile` (modes no-op on Windows) and `ensureAppdataDir`/`ensureConfigDir`/`ensureTempDir`. Exports the `FsReader` type.
- `src/platform/shell.ts` — `Executor`/`SpawnSyncResult`, `createExecutor`, command/runtime detection, and cross-platform runtime startup with readiness polling.

### `skills/` — Portable Agent Skills and their references

- `skills/container/SKILL.md` — Portable Agent Skill for host-side Container setup, configuration, customization, builds, migration, and troubleshooting.
- `skills/container/references/configuration.md` — Settings schema, customization routing, pack IDs, mounts, persisted configs, and build selection.
- `skills/container/references/migration.md` — Agent-assisted V2-to-V3 content migration procedure.
- `skills/container/references/permissions.md` — Hands-off permission configuration for supported coding harnesses.
- `skills/container/references/troubleshooting.md` — Safe diagnostics, skill provisioning caveats, source inspection, and contribution escalation.
- `skills/container/references/windows.md` — Native Windows and WSL requirements, paths, and caveats.

### `tests/` — Test files (Vitest)

- `tests/setup.ts` — Global mocks for @clack and console (silences output).
- `tests/args.test.ts` — Full coverage of `parseArgs` (all commands, targets, errors, `--`).
- `tests/commands.test.ts` — build/stop/remove/list/create/attach/run flag routing + `getBuildDirty`.
- `tests/config.test.ts` — SettingsStore/StateStore (load/save/validate Result), update check tests.
- `tests/docker.test.ts` — full `ContainerClient` (listRunning, startedAt, `attachedSessionCount`), `buildImage` (stages, dirty, failures), dockerfile generators (including OpenCode versions), `getMounts`, session helpers (`stopContainerIfLastSession`), orphan sweep.
- `tests/onboarding.test.ts` — `needsOnboarding`, harness/tool detect (Executor-based, including manual-only legacy harness), config migrate/default source helpers, and start-before-build behavior.
- `tests/tos.test.ts` — ensureTosAccepted (accept/decline/cancel/load error paths).
- `tests/setup.test.ts` — Runtime setup and migration tests.

#### `tests/platform/` — Platform tests

- `tests/platform/helpers.ts` — `withPlatform` helper (sets/restores `process.platform` to exercise Windows vs POSIX branches).
- `tests/platform/os.test.ts` — `Platform` enum, `getPlatform`, `isWindows`/`isLinux`/`isMacos` per platform.
- `tests/platform/paths.test.ts` — path constants, `homeDir`, `expandHomePath`, `resolveProjectPath`, `generateContainerName` (incl. WSL/native-Windows canonicalization), `resolveContainerName`, `buildBindMount` (POSIX + Windows).
- `tests/platform/shell.test.ts` — `createExecutor`, command/runtime detection, default selection, and Docker/Podman startup behavior across platforms.

### `__mocks__/` — Module mocks for testing (fs only)

- `__mocks__/fs.ts` — Memfs-based fs mock (with cpSync polyfill).
- `__mocks__/fs/promises.ts` — Memfs fs/promises mock.

- Tests use inline queue-based spawnSync mocks for `Executor` and wrap memfs in `Filesystem` (no separate child_process mock).

### `website/` — Astro + Tailwind single-page marketing website

- `website/src/components/GetStarted.astro` — Responsive OS-tabbed installation guide with themed command cards, numbered steps, keyboard navigation, and copy controls.
- `website/src/pages/index.astro` — Single-page Container landing page composing the animated hero, safety and workflow feature grids, installation guide, and footer.
- `website/src/styles/global.css` — Tailwind import, local font faces, and Container design-system theme tokens; page styling lives in Astro Tailwind utilities.
- `website/public/install.sh` — macOS/Linux installer/upgrader served with the website; detects OS/arch, downloads the matching GitHub Release archive, verifies SHA256, stages/replaces the binary in `~/.code-container/bin`, and prints npm fallback guidance for unrecoverable standalone install failures.
- `website/public/install.ps1` — Windows installer/upgrader served with the website; detects x64/arm64, downloads the matching GitHub Release archive, verifies SHA256, stages/replaces the binary in `~/.code-container/bin`, schedules a helper when the running exe is locked, and prints npm fallback guidance for unrecoverable standalone install failures.
- `website/public/_headers` — Cloudflare Pages response headers for installer content types and cache policy.

### `resources/` — Packaged Dockerfiles (only User template)

- `resources/Dockerfile.User` — Legacy default User Dockerfile template; runtime setup now embeds this template in `src/setup.ts`.

### `scripts/` — Utility scripts

- `scripts/build-js.sh` — Builds TypeScript JS output, writes generated `dist/package.json` with the root package version, and marks the CLI entry executable.
- `scripts/build-binary.sh` — Compiles Bun standalone binaries for all target platforms via `bun build --compile`.
- `scripts/precommit.sh` — Pre-commit hook (lint + typecheck).
- `scripts/package-release.sh` — Packages Bun standalone binaries into release archives and writes binary checksums.
- `scripts/generate-release-notes.sh` — Extracts a tagged section from `Changelog.md` to `release-notes.md` (gitignored); exits non-zero if no entry exists, failing the release workflow.
- `scripts/release.sh` — Local release driver: verifies a changelog entry exists (via `generate-release-notes.sh`), runs `npm version`, and pushes `main` with tags.

### Release Config

- `.github/workflows/publish.yml` — Tag-triggered release workflow: builds npm JS, publishes npm, compiles Bun binaries, packages release assets, and creates the GitHub Release with `gh release create`.

## Misc Files (Configs, meta, etc.)

- `README.md` — Concise project overview, installation and usage guide, customization links, and security boundaries.
- `Changelog.md` — Release changelog; tagged sections drive release notes.
- `AGENTS.md` — Agent instructions; points to the Operator partitions.
- `CLAUDE.md` — Pointer to `AGENTS.md`.
