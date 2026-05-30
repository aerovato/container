# V2 to V3 Migration (for AI Agents)

The automatic postinstall script only archives old V2 files into `~/.code-container/archive/`. It performs no content migration.

You (the agent) must perform the actual migration by converting each old file's data into the equivalent V3 mechanisms (`settings.json` and `Dockerfile.User`).

## Detection

Check whether `~/.code-container/archive/` contains any of these files:

- `MOUNTS.txt`
- `DOCKER_FLAGS.txt`
- `DOCKER_RUN_FLAGS.txt`
- `Dockerfile.Packages`
- Old `Dockerfile.User`

If the archive directory is empty or missing, no V2 migration work is needed.

## Migration Steps

Read [Settings.md](/docs/Settings.md).

For each archived file that exists, read the archived file and migrate as described below. **Skip any item whose equivalent already exists in the current V3 configuration; this indicates that migration has already happened.**

If you have any questions or if there are any problems during migration **STOP** and immediately consult the user.

### DOCKER_FLAGS.txt and DOCKER_RUN_FLAGS.txt

- Read both files.
  - DOCKER_FLAGS.txt are flags for both `docker run` and `docker exec`.
  - DOCKER_RUN_FLAGS.txt are flags for `docker run` only.
- Write the flags into `settings.json`:
  - `dockerRunFlags`
  - `dockerExecFlags`
- If there are existing flags, deduplicate and append.

### MOUNTS.txt

- Parse each mount line.
- Convert to `settings.json`:
  - Common host mounts (e.g. SSH, gitconfig) → `systemMounts`
  - Other mounts → append as `-v` entries in `dockerRunFlags`

### Dockerfile.Packages

- Read the content after the FROM line.
- Migrate the commands via the following channels:
  - `~/.code-container/Dockerfile.User` - Prefer for user-level packages
  - `settings.json` → `dockerfileCore.customCommands`- Prefer for system-level packages with long build times

### Old Dockerfile.User

- If the file does not start with `FROM localhost/aerovato/container-v3-harness:latest`: It was from V2.
- Read the new `~/.code-container/Dockerfile.User`
- Update the new `Dockerfile.User` with archived `Dockerfile.User` instructions
