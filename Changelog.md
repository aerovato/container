# Changelog

## v3.3.0

Additions:

- Native Windows support (win32 + Docker Desktop) alongside Linux, macOS, and WSL
- Platform abstraction layer (`src/platform/`) isolating all OS-dependent logic, enforced by an ESLint rule
- Drive-letter path canonicalization: native Windows and WSL paths for the same project resolve to one container
- New `internal/Specs/Windows.md` and `docs/Windows.md`
- Add runtime installation instructions to onboarding
- Modify onboarding to install a default set of harnesses if none are installed

Changes:

- File permission modes now no-op on Windows (Windows ACLs govern permissions)
- `commandExists` uses `where` on Windows (`which` on POSIX)
- Runtime default prefers Docker on Windows when both Docker and Podman are available

FYI:

- Tool and harness config paths remain POSIX-oriented; on Windows they resolve against the home directory and may need manual copying where a tool stores config elsewhere
- UNC paths are not supported as project directories
- See [docs/Windows.md](docs/Windows.md) for full details

## v3.2.0

Additions:

- Added tool packs: configurable development tools that you can enable to install inside your container
- Some tool packs come with mounts for specific config files or directories
- New `container build tools` target to rebuild from Tools stage

Changes:

- Python moved from core image to optional tool pack
- Git config and Vim config added as config-only tool packs (mount host configs into container)
- Gitconfig removed from `systemMounts` (now managed via `git-config` tool pack)
- 4-stage build pipeline: Core → Tools → Harness → User

FYI:

- To configure which tools are enabled, choose "Custom Setup" during re-onboarding or run `container settings` and select "Enabled Tools"
- Use space to toggle tools and enter to confirm
- After changing tools, rebuild the image

## v3.1.1

- Daily async update check via NPM registry

## v3.1.0

- `container settings` interactive menu for harnesses, runtime, and mounts
- Orphaned container cleanup on startup (stops containers idle > 5 minutes)
- Session cleanup on SIGINT, SIGHUP, SIGTERM signals

## v3.0.3

- Antigravity harness pack
- Docker/Podman daemon running check before operations

## v3.0.2

- Updated banner and docs

## v3.0.1

- V2 uninstall instructions in README
- NPM publish config fix

## v3.0.0

- V3 rewrite
- Dynamic Dockerfile generation (`dockerfileCore`, `dockerfile-harness`)
- Multi-runtime support (Docker, Podman)
- Interactive onboarding (Express and Custom) with harness detection and config migration
