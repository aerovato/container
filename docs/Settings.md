# Settings (`settings.json`)

Location: `~/.code-container/settings.json`

This is the primary configuration file for `container`. Most user preferences and customizations are stored here (instead of the old V2 text files).

**Important:** Default values are never written unless the user explicitly sets them. The application merges user values with sensible defaults at runtime.

## Top-Level Keys

- `migrationVersion` (number):
  - Set by postinstall during V2→V3 migration.
  - Internal. Do not edit.

- `onboardingVersion` (number):
  - Tracks completed onboarding.
  - Internal. Do not edit.

- `tosVersion` (number):
  - Tracks accepted Terms of Service version.
  - Internal. Do not edit.

- `enabledHarnesses` (string[]):
  - List of harness pack IDs to include in the image.
  - Example: `["opencode", "gemini", "codex"]`

- `runtime` ("docker" | "podman"):
  - Container runtime to use.
  - Example: `"docker"`

- `systemMounts` (object):
  - Control automatic host mounts.
  - See section below.

- `dockerRunFlags` (string[]):
  - Extra flags passed only to `run` (e.g. ports, env vars).
  - Flags are passed directly to spawnSync args; ensure flags are separated correctly.
    - Correct: `["-p", "8080:80"]`
    - Incorrect: `["-p 8080:80"]`

- `dockerExecFlags` (string[]):
  - Extra flags passed only to `exec`.
  - Example: `["-e", "FOO=bar"]`

- `dockerfileCore` (object):
  - Advanced control over the base image generation.
  - See section below.

## `systemMounts`

```json
{
  "gitconfig": true, // Mount ~/.gitconfig (read-only). Default: true
  "ssh": false // Mount ~/.ssh (read-only). Default: false
}
```

## `dockerfileCore`

Gives full control over the first stage of the image (replaces much of the old Dockerfile.Packages behavior).

```json
{
  "baseImage": "ubuntu:24.04",
  "workdir": "/root",
  "cmd": "[\"/bin/bash\"]",
  "promptCommand": "RUN echo 'PS1=\"\\[\\033[01;32m\\][container]\\[\\033[00m\\] ...' >> /root/.bashrc",
  "disableDefaultCommands": false,
  "customCommands": [
    "RUN apt-get update && apt-get install -y postgresql-client",
    "ENV MY_VAR=hello"
  ]
}
```

All fields are optional. When omitted, built-in defaults are used.

## Recommended Workflow for Agents

When a user wants to customize their environment:

1. For simple packages/tools → edit `Dockerfile.User`
2. For base system changes (before harnesses) → edit `dockerfileCore` in `settings.json`
3. For which harnesses to include → edit `enabledHarnesses`
4. For runtime flags or mounts → use the dedicated keys above

After changing `dockerfileCore` or `enabledHarnesses`, the next `container` run will prompt the user to rebuild.

## Do Not Edit

- `migrationVersion`, `onboardingVersion`, `tosVersion` (managed automatically)
- Anything inside `temp/` (generated files)
  - Dockerfile.Core and Dockerfile.Harness are generated **dynamically** based on settings. Editing them directly does nothing.

For the full authoritative schema, see `src/types.ts` in the source repository.
