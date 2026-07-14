---
name: container
description: Host-side setup, configuration, customization, builds, migration, and troubleshooting for the Aerovato Container CLI. Use when working with Aerovato Container, settings.json, Dockerfile.User, build stages, V2-to-V3 migration, mounts, harnesses, tools, permissions, Docker, or Podman. Do not use it to expose host Container configuration inside managed containers.
license: BSD-3-Clause
compatibility: Configuration tasks require host-side access to ~/.code-container. Setup supports Windows, macOS, Linux, and WSL with Docker or Podman.
metadata:
  author: aerovato
  repository: https://github.com/aerovato/container
---

# Aerovato Container

Use this skill to help users operate the Aerovato `container` CLI. Confirm that the user means the [Aerovato Container](https://github.com/aerovato/container) sandboxing CLI command when the word "container" is ambiguous.

## Capability Boundary

Treat setup and customization as host-side work.

- Host-side agents can inspect and modify `~/.code-container/settings.json`, `~/.code-container/Dockerfile.User`, and `~/.code-container/configs/` with user approval.
- Agents inside a managed Container normally cannot access the host-side settings or user Dockerfile.
- The optional `agents-directory` tool pack mounts Container's persisted copy of `~/.agents`; it does not expose host-side Container settings.
  - If you suspect you're inside a Container, ask the user to run outside the container.
- Never mount the complete host `~/.code-container/` directory into a managed container.
- If `~/.code-container/` is missing, determine whether this is a fresh host installation or a managed Container session. Ask the user when uncertain.
- If host files are inaccessible, explain the boundary and provide host-side steps instead of creating shadow configuration inside the managed container.

## Operating Rules

1. Inspect the current platform, installed version, settings, user Dockerfile, and relevant persisted configs before proposing changes.
2. Obtain approval before installing software, changing files, starting a build, accessing the network, or cloning source code unless the user's request already explicitly authorizes that action.
3. Make the smallest requested change. Preserve unknown JSON keys and existing Dockerfile instructions.
4. Validate JSON after editing settings. Never write comments into `settings.json`.
5. Select the narrowest correct build target and explain whether existing project containers must be recreated.
6. Report the files changed and commands run.

Do not edit these internal values:

- `migrationVersion`
- `onboardingVersion`
- `tosVersion`
- Anything under `~/.code-container/temp/`

Do not run `container`, `container run`, or `container attach` from a non-interactive agent command because they open an interactive shell. Ask the user to run interactive onboarding and settings flows. Non-interactive commands such as `container --version`, `container --help`, `container list`, and approved builds may be run when appropriate. Treat `stop`, `remove`, and container recreation as destructive actions requiring explicit approval.

## Setup

Requirements are Windows, macOS, Linux, or WSL plus Docker or Podman.

Install on macOS or Linux:

```bash
curl -fsSL https://container.aerovato.com/install.sh | sh
```

Install on Windows PowerShell:

```powershell
irm https://container.aerovato.com/install.ps1 | iex
```

Alternatively, install through npm when Node.js is available:

```bash
npm install -g @aerovato/container
```

After installation:

1. Check `container --version`.
2. Check `~/.code-container/archive/` for V2 files and follow [the migration guide](references/migration.md) when needed.
3. Ask the user to run `container init` and complete Express or Custom onboarding.
4. If onboarding does not complete the initial image build, run or ask the user to run `container build full`.

Read [the Windows reference](references/windows.md) for native Windows and WSL caveats.

## Route The Task

- For settings, packages, tools, harnesses, flags, mounts, build targets, or persisted config behavior, read [configuration](references/configuration.md).
- For archived V2 files, read [migration](references/migration.md).
- For hands-off harness permission requests, read [permissions](references/permissions.md) and explain the security implications.
- For failures, unexpected behavior, skill availability, or source inspection, read [troubleshooting](references/troubleshooting.md).

## Customization Rules

Use `~/.code-container/Dockerfile.User` for ordinary packages and user-layer setup. Preserve this required base as the first Dockerfile instruction:

```dockerfile
FROM localhost/aerovato/container-v3-harness:latest
```

Configure `dockerfileCore` only for base-image changes or commands that must run before tool and harness installation. Use dedicated settings keys for harnesses, tools, runtime selection, SSH, and runtime flags.

Build after direct changes:

- `Dockerfile.User`: `container build user`
- `enabledHarnesses`: `container build harness`
- `enabledTools`: `container build tools`
- `dockerfileCore`: `container build full`
- Runtime, flags, mounts, or persisted config content: no image build unless another image setting also changed

Changes to creation-time flags or the set of mounted configs affect only newly created project containers. Ask before removing and recreating an existing container.

## Last-Resort Source Inspection

When documentation, configuration inspection, and runtime diagnostics cannot explain behavior, source inspection is allowed as a last resort. Ask before cloning or using network access. Prefer the source tag matching the installed `container` version instead of assuming `main` has identical behavior.

If source inspection reveals a reproducible bug or a clear, logical, non-breaking improvement, explain the evidence and ask whether the user wants help contributing it to `aerovato/container`. Do not create an issue, fork, branch, commit, or pull request without explicit approval. Follow [the troubleshooting source-inspection procedure](references/troubleshooting.md).
