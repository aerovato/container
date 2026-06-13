# Changelog

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
