# Tool Packs

Tool Packs extend the container build system to install and configure common development tools alongside Harness Packs. They share the same registry, build stage, mount, and detection model.

## Registry

Tool packs are defined in `src/tool-packs.ts` as the `TOOL_PACKS` constant.

Each pack specifies:

- `id`: Unique identifier used in settings and CLI.
- `name`: Human-readable label shown in prompts.
- `shouldEnable`: Boolean or shell command. When boolean, indicates whether the pack is enabled by default during onboarding. When string, used as a detection command to check whether the tool is installed on the host.
- `dockerfileLines`: Array of Dockerfile `RUN` commands to install the tool. Empty arrays are allowed (for config-only packs).
- `config`: Array of mount definitions (`ConfigMount`) for host config directories or files to be mounted into the container at the corresponding paths.

The following packs are supported:

- `python`
- `bun`
- `enhanced-tools`
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

## Build Pipeline

The build pipeline is extended from three stages to four:

- Core
- Tools (new)
- Harness
- User

Images are tagged under `localhost/aerovato/container-v3-*`:

- Core image: `...-core:latest`
- Tools image: `...-tools:latest`
- Harness image: `...-harness:latest`
- User image: `...:latest`

`Dockerfile.Tools` is a generated file on disk written to the temp directory at build time. It is produced by `generateDockerfileTools(enabledToolIds)` in `src/dockerfile-tools.ts` and installs all enabled tool packs in order.

## Staleness Detection

`StateSchema.buildDirty` accepts three levels: `tools`, `harness`, and `undefined`.

- Enabling or disabling a tool pack marks the build dirty at `tools`.
- Changing `dockerfileCore` should also still mark dirty appropriately.
- Changing enabled harnesses marks the build dirty at `harness`.

Build targets and their dirty clearing behavior:

- `full` — Rebuilds from Core forward; clears any dirty state.
- `tools` — Rebuilds from Tools forward; clears only if `buildDirty` is `tools`.
- `harness` — Rebuilds from Harness forward; clears only if `buildDirty` is `harness`.
- `user` — Rebuilds only User; preserves all dirty state.

## Runtime Mounts

Tool pack mounts are injected into the container alongside harness pack mounts by `getMounts()` in `src/container.ts`. Paths are resolved from `~/.code-container/configs/` to their corresponding container paths.

## Settings & CLI

`settings.json` supports the `enabledTools` key: an array of enabled tool pack IDs.

- `container settings` offers a "Tools" menu option to multiselect enabled packs.
- If tool changes are saved, the user is prompted to rebuild (Full, Tools & Harness, or Skip).
- The onboarding flow (both Express and Custom) detects installed tools and lets the user select which to enable.
