# Configuration

Use this reference when changing `~/.code-container/settings.json`, `~/.code-container/Dockerfile.User`, enabled packs, runtime flags, mounts, or persisted harness and tool configurations.

## Storage

Container owns this host-side structure:

```text
~/.code-container/
├── archive/              # Archived V2 files
├── configs/              # Persisted harness and tool configs mounted into containers
├── Dockerfile.User       # User-owned final image layer
├── settings.json         # Primary configuration
└── temp/                 # Generated Dockerfiles and internal state; do not edit
```

Only modify `settings.json`, `Dockerfile.User`, and requested files under `configs/`. Preserve unknown settings keys and omitted defaults. Do not edit migration, onboarding, or TOS version fields.

## Settings Schema

Supported user-facing top-level keys:

- `enabledHarnesses`: Array of harness pack IDs.
- `enabledTools`: Array of tool pack IDs.
- `runtime`: `"docker"` or `"podman"`.
- `systemMounts`: Object with optional Boolean `ssh`.
- `dockerRunFlags`: Array of individual arguments passed during container creation.
- `dockerExecFlags`: Array of individual arguments passed when opening an interactive session.
- `dockerfileCore`: Advanced base-stage configuration.

Internal keys that must not be edited:

- `migrationVersion`
- `onboardingVersion`
- `tosVersion`

Container validates the complete JSON document. Preserve the existing object and change only requested values. Flags must be separate array entries:

```json
{
  "dockerRunFlags": ["-p", "8080:80"],
  "dockerExecFlags": ["-e", "FOO=bar"]
}
```

Do not combine a flag and value into one entry such as `"-p 8080:80"`.

## Dockerfile Core

All `dockerfileCore` fields are optional:

```json
{
  "dockerfileCore": {
    "baseImage": "ubuntu:24.04",
    "workdir": "/root",
    "cmd": "[\"/bin/bash\"]",
    "promptCommand": "RUN echo 'custom prompt' >> /root/.bashrc",
    "disableDefaultCommands": false,
    "customCommands": [
      "RUN apt-get update && apt-get install -y postgresql-client",
      "ENV MY_VAR=hello"
    ]
  }
}
```

Use this only when changing the base image or when commands must run before tool and harness installation. Run `container build full` after any change. Direct file edits do not reliably create a core dirty-state prompt.

## User Dockerfile

Prefer `~/.code-container/Dockerfile.User` for ordinary package installation and final-layer customization. Preserve existing instructions and this required base as the first Dockerfile instruction:

```dockerfile
FROM localhost/aerovato/container-v3-harness:latest
```

Example:

```dockerfile
RUN apt-get update && apt-get install -y postgresql-client
RUN npm install -g bun
RUN pip install requests
```

Run `container build user` afterward. User Dockerfile changes are not tracked automatically.

## Harness Packs

Current harness IDs:

- `claude`: Claude Code
- `opencode`: OpenCode
- `codex`: OpenAI Codex
- `pi`: Pi
- `gemini`: Gemini CLI
- `copilot`: GitHub Copilot CLI
- `grok`: Grok Build
- `cursor`: Cursor CLI
- `nitro`: Aerovato Nitro
- `antigravity`: Antigravity CLI

After changing `enabledHarnesses`, run `container build harness`. Newly enabled harness config mounts require recreation of existing project containers.

## Tool Packs

Current tool IDs:

- `python`
- `bun`
- `enhanced-tools`
- `agents-directory`
- `npm-config`
- `git-config`
- `vim-config`
- `deno`
- `rust`
- `go`
- `uv`
- `gh`
- `aws`
- `gcloud`
- `azure`
- `neovim`

Onboarding detects tools and writes an explicit selection. When `enabledTools` is absent at build or mount time, no tool packs are implicitly applied.

After changing `enabledTools`, run `container build tools`. Newly enabled tool config mounts require recreation of existing project containers.

The `agents-directory` pack copies or prepares host `~/.agents` under `~/.code-container/configs/.agents` and mounts that persisted copy at `/root/.agents`. It does not live-sync later host changes. A globally installed skill added to host `~/.agents/skills` after onboarding may need to be installed or copied into Container's persisted `.agents` config separately.

## Mounts And Configs

`systemMounts.ssh` controls the read-only host `~/.ssh` mount. Default behavior is disabled when the key is absent.

Git configuration is supplied by the `git-config` tool pack, not by `systemMounts`.

Harness and tool config sources live under `~/.code-container/configs/` and are mounted read-write at pack-specific destinations. Edit these persisted copies when changing behavior inside managed containers. Do not edit the normal host harness config and expect an existing persisted copy to update automatically.

For a custom bind mount, add correctly separated runtime arguments to `dockerRunFlags`, for example:

```json
{
  "dockerRunFlags": [
    "--mount",
    "type=bind,source=/host/path,target=/container/path"
  ]
}
```

Only mount resources the user explicitly approves. Never mount the complete host `~/.code-container/` directory.

Mounts and `dockerRunFlags` apply at container creation. `dockerExecFlags` apply when attaching. Existing containers must be removed and recreated before creation-time changes take effect; obtain explicit approval first.

## Build Selection

Container builds four stages in order: Core, Tools, Harness, and User.

- `container build full`: Core through User.
- `container build tools`: Tools through User.
- `container build harness`: Harness and User.
- `container build user`: User only.

Use the narrowest target that begins at or before the changed stage. Runtime selection, flags, mount settings, and mounted config content do not themselves require an image rebuild.
