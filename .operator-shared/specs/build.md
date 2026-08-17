# Build

The build system produces a final runnable image through a four-stage pipeline. Each stage can be rebuilt independently via `container build`.

## Image Stages

- Core: Base operating system, essential tools, Node.js, and Python. Configurable via `dockerfileCore` in settings.
- Tools: Installs the selected development tools on top of Core.
- Harness: Installs the selected coding harnesses on top of Tools.
- User: Applies user customizations from `Dockerfile.User` on top of Harness. This is the image used for containers.

Images are tagged under the `localhost/aerovato/container-v3-*` namespace.

## Build Targets

- `full`: Rebuilds Core, Tools, Harness, and User. Clears all staleness tracking.
- `tools`: Rebuilds Tools, Harness, and User. Clears tools-level staleness.
- `harness`: Rebuilds Harness and User. Clears harness-level staleness.
- `user`: Rebuilds only User. No effect on staleness tracking.

After any successful build, unused images from previous builds are pruned.

## Staleness Detection

A dirty flag in ephemeral state tracks when a rebuild is advisable:

- Changing `dockerfileCore` marks the build dirty at the core level.
- Changing enabled tools marks the build dirty at the tools level.
- Changing enabled harnesses marks the build dirty at the harness level.

When starting a container, if the image is stale, the user is prompted to rebuild. Declining the prompt continues with the existing image. The flag is cleared only by the appropriate build target.

`Dockerfile.User` changes are never tracked automatically; users rebuild manually when needed.

## Tool Packs

Tool packs extend the build pipeline by adding an intermediate Tools stage between Core and Harness. For full details on registry, defaults, and runtime behavior, see [tool-packs.md](tool-packs.md).
