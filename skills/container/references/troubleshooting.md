# Troubleshooting

Start with documentation, current configuration, and non-interactive diagnostics. Inspect source only when those do not explain the behavior.

## Safe Diagnostics

Confirm the installed CLI and available commands:

```bash
container --version
container --help
container list
```

Do not run `container`, `container run`, or `container attach` through a non-interactive agent command. They open an interactive shell.

Check the configured runtime in `~/.code-container/settings.json`, then use its normal status command when needed:

```bash
docker info
podman info
```

Run only the relevant command. Runtime startup may require the user to open Docker Desktop or start the Podman service.

## Configuration Failures

For settings load failures:

1. Parse `~/.code-container/settings.json` as JSON.
2. Check keys and value types against [configuration](configuration.md).
3. Remove comments and trailing commas.
4. Preserve unknown valid data while correcting only the invalid field.
5. Never repair internal version values by guessing.

Generated files under `~/.code-container/temp/` are not configuration sources. Fix settings or the user Dockerfile and regenerate through an appropriate build.

## Build Failures

Identify the first failing stage and command. Use the narrowest target that includes the changed stage:

- Core failure: `container build full`
- Tools failure: `container build tools`
- Harness failure: `container build harness`
- User Dockerfile failure: `container build user`

Do not repeatedly broaden the build without understanding the first error. Check network access, package repository availability, runtime readiness, and Dockerfile syntax. User Dockerfile changes and direct core edits do not reliably produce automatic stale-build prompts.

## Changes Not Appearing

Use these distinctions:

- Image content changed: rebuild from the affected stage.
- Persisted config content changed: bind mounts normally expose it immediately.
- Enabled pack changed: rebuild and recreate existing project containers so their mount set is regenerated.
- `dockerRunFlags` or mounts changed: recreate existing project containers.
- `dockerExecFlags` changed: the next interactive attachment uses them.
- Runtime changed: containers belonging to the old runtime are not automatically moved.

Removing a project container discards container-local state. Ask for explicit approval and explain the impact before `container remove` or equivalent runtime commands.

## Skill Availability Inside Managed Containers

A host-side global skill installation does not guarantee availability inside managed containers.

- Claude Code primarily uses `.claude/skills/`.
- Codex, OpenCode, Gemini CLI, GitHub Copilot, and several other agents support `.agents/skills/`.
- The `agents-directory` tool pack mounts `~/.code-container/configs/.agents`, not the live host `~/.agents` directory.
- Installing a skill into host `~/.agents/skills/` after onboarding does not automatically update the persisted copy.
- Project-local skills travel with the mounted project only when stored in a location recognized by the selected harness.

Do not solve discovery by mounting the complete host `~/.code-container/`. If automatic provisioning is required, explain that it is a separate Container product and security decision.

## Last-Resort Source Inspection

Use source inspection only after documented behavior, current files, and runtime output are insufficient.

1. Record `container --version` and the exact observed behavior.
2. Ask the user before network access or cloning.
3. Clone `https://github.com/aerovato/container` into a temporary location outside the user's project.
4. Prefer the release tag matching the installed version, commonly `v<version>`.
5. If no matching tag exists, state that limitation before inspecting `main`.
6. Treat the clone as read-only unless the user explicitly approves contribution work.
7. Inspect the smallest relevant source path and its tests.
8. Do not run release workflows, standalone binary compilation, or interactive Container sessions.
9. Compare source behavior with the installed version and report file references and concrete evidence.
10. Remove the temporary clone afterward only when that cleanup was included in the user's approval.

Useful source areas include:

- `src/types.ts`: Settings and state schemas.
- `src/container.ts`: Mount generation and container execution.
- `src/docker.ts`: Build stages and dirty-state clearing.
- `src/harness-packs.ts`: Harness IDs, installation, and config mounts.
- `src/tool-packs.ts`: Tool IDs, installation, and config mounts.
- `src/onboarding.ts`: Detection, config copying, and setup behavior.
- `src/platform/`: Platform-specific paths, filesystems, and runtime startup.
- `tests/`: Expected behavior and regressions.

If the evidence shows a reproducible bug or a clear, logical, non-breaking improvement, explain:

- Expected behavior.
- Actual behavior.
- Reproduction steps.
- Relevant source and tests.
- The smallest likely correction.

Then ask whether the user wants help contributing to `aerovato/container`. Do not create an issue, fork, branch, commit, or pull request without explicit approval.
