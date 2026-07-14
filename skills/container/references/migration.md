# V2 To V3 Migration

Runtime setup archives V2 files but does not migrate their content. Perform content migration only with user approval.

## Detection

Inspect `~/.code-container/archive/` for:

- `MOUNTS.txt`
- `DOCKER_FLAGS.txt`
- `DOCKER_RUN_FLAGS.txt`
- `Dockerfile.Packages`
- An old `Dockerfile.User`

If none exist, no V2 content migration is needed. Read [configuration](configuration.md) before editing current files.

Skip an item when its equivalent is already present in the V3 configuration. This indicates that it may already have been migrated. Stop and ask the user whenever intent or equivalence is ambiguous.

## Runtime Flags

V2 `DOCKER_FLAGS.txt` applied to both `docker run` and `docker exec`. Add its individual arguments to both `dockerRunFlags` and `dockerExecFlags`.

V2 `DOCKER_RUN_FLAGS.txt` applied only to `docker run`. Add its individual arguments to `dockerRunFlags`.

Preserve existing arguments, split flags and values into separate array entries, and deduplicate exact equivalents.

## Mounts

Convert each `MOUNTS.txt` entry according to its purpose:

- Host SSH mount: set `systemMounts.ssh` to `true`.
- Git configuration: enable the `git-config` tool pack.
- Other mounts: append separated `--mount` or `-v` arguments to `dockerRunFlags`.

Never translate a mount into access to the complete host `~/.code-container/` directory. Confirm sensitive or broad host mounts with the user.

## Dockerfile Packages

Ignore the archived base `FROM` instruction and migrate subsequent instructions through the appropriate V3 layer:

- Ordinary user packages and final setup: append to `~/.code-container/Dockerfile.User`.
- Base-image changes or commands that must precede tools and harnesses: append to `dockerfileCore.customCommands`.

Preserve this required base as the first instruction in the current user Dockerfile:

```dockerfile
FROM localhost/aerovato/container-v3-harness:latest
```

Do not duplicate instructions already present.

## Old User Dockerfile

An archived user Dockerfile is from V2 when it does not use the V3 harness base. Read both old and current files, then append only the still-relevant instructions after the current V3 base. Do not restore the old `FROM` line.

## Completion

Validate `settings.json` as JSON and review the resulting Dockerfile before building.

- Any `dockerfileCore` migration: `container build full`
- Tool selection only: `container build tools`
- Harness selection only: `container build harness`
- User Dockerfile only: `container build user`

Creation-time flag and mount migrations also require project containers to be recreated. Obtain explicit approval before removing an existing container.
