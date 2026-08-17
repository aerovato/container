# Configuration

`settings.json` controls runtime behavior of `container`. Only user-explicit values are stored; defaults apply when keys are absent.

## Keys

- `dockerfileCore`: Customizations for the base image stage (base image, working directory, installed tools, shell prompt, extra commands). Changes mark the build as dirty.
- `enabledHarnesses`: List of harness pack IDs to include during the harness build stage. Changes mark the build dirty at the harness level.
- `enabledTools`: List of tool pack IDs to include during the tools build stage. Changes mark the build dirty at the tools level.
- `runtime`: Preferred container runtime (`docker` or `podman`). Auto-detected on first run if unset. Used for all image and container operations.
- `systemMounts`: Controls read-only host mounts.
  - `gitconfig`: Mount `~/.gitconfig` (default: true).
  - `ssh`: Mount `~/.ssh` (default: false).
- `dockerRunFlags`: Extra flags passed only to container creation (`run`).
- `dockerExecFlags`: Extra flags passed only to interactive sessions (`exec`).`

## Storage

User data lives in `~/.code-container/`.

- `settings.json`: Stores the above keys.
- `configs/`: Per-harness configuration files copied from the host (mounted into containers).
- `Dockerfile.User`: User-editable customizations applied in the final build stage.
- `temp/state.json`: Ephemeral state (build dirty flag, last successful upgrade timestamp).

`container` ensures required directories exist on startup.
