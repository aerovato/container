<p align="center">
  <img src="https://raw.githubusercontent.com/aerovato/container/main/.github/README/banner.png" alt="Banner" />
</p>

#### `container`: Isolated Docker environments for your autonomous coding harnesses.

#### Simple. Lightweight. Secure.

## Quickstart

### Prerequisites

- **Docker or Podman** — Docker Desktop/Engine or Podman
- **A POSIX-Compatible System** — Linux, macOS, WSL

### Installation

1. `container` is available as an NPM package. Install with:

   ```bash
   npm install -g @aerovato/container
   ```

2. Run `container init` (interactive onboarding). It will:
   - Detect installed harnesses (Claude Code, OpenCode, etc.)
   - Migrate your existing configs
   - Let you choose Docker or Podman
   - Configure SSH and git mounts

3. Build the image (first build can take 5+ minutes):

   ```bash
   container build
   ```

You're done. `container` is ready to use.

### Shameless Self-Promotion

Try [Nitro, a simple and efficient Bash harness.](https://github.com/aerovato/nitro) 11x cheaper, 75x more efficient than Claude Code for simple Bash tasks.

```bash
npm install -g @aerovato/nitro
```

## Usage

Navigate to any project and run `container`:

```bash
cd /path/to/your/project
container
```

Inside the container: Start your harness and develop like normal.

```bash
opencode                     # Start OpenCode
npm install <package>        # Persists per container
# ...
```

Your project is mounted at `/root/<project-name>`. Changes persist across sessions. Harness configs are shared across all containers.

### Common Commands

```bash
container                           # Enter container for current directory
container run /path/to/project      # Enter for a specific project
container run /path -- -p 8080:80   # Pass extra runtime flags
container build [full|harness|user] # Build/rebuild image
container list                      # List all containers
container stop                      # Stop container
container remove                    # Remove container
container init                      # Re-run onboarding
```

## Customization

Customization is done through two places:

### 1. `~/.code-container/Dockerfile.User`

Add packages and setup steps here. Example:

```dockerfile
FROM localhost/aerovato/container-v3-harness:latest

RUN npm install -g bun typescript
RUN pip install requests

RUN npx opencode plugin opencode-quotes-plugin -g
```

After editing, run `container build user` to rebuild the image

### 2. `~/.code-container/settings.json`

Primary configuration file. See [docs/Settings.md](docs/Settings.md) for more details.

Common settings:

- `enabledHarnesses` — which harnesses to install
- `runtime` — `"docker"` or `"podman"`
- `dockerfileCore` — advanced control over the base image
- `systemMounts` — gitconfig and SSH mounts
- `dockerRunFlags` / `dockerExecFlags` — extra runtime flags

Hint: Clone this repo and ask your agent to configure for you.

### For V2 Users

After upgrading to V3, all configurations will be archived to `~/.code-container/archive`. To migrate configurations over, ask your agent to read and perform the steps in [docs/Migration.md](docs/Migration.md).

## Features

- **Isolation** — Destructive actions stay inside the container
- **3-Stage Builds** — Core → Harness → User (rebuild only what changed)
- **Configurable Runtime** — Docker or Podman
- **Harness Packs** — Choose exactly which tools to enable
- **Persistent State** — Workspaces and configs survive across sessions
- **Simultaneous Work** — Multiple agents can safely work on the same project

## Security

- `container` protects your host filesystem from `rm -rf`s
- Packages and configurations inside containers stay localized
- Isolation prevents cross-contamination across containers

**Important limitations**:

- `container` does not protect against prompt injection or agent misalignment
- Network access is available inside the container
- Harness configs will be mounted inside container

## Uninstall

```bash
npm uninstall -g @aerovato/container
rm -rf ~/.code-container
```

Consider backing up the harness configurations in `~/.code-container/configs` before removing.
