<p align="center">
  <img src="https://raw.githubusercontent.com/aerovato/container/main/.github/README/banner.jpg" alt="Container by Aerovato Research" />
</p>

# `container`

Persistent, isolated workspaces for AI coding agents.

`container` gives each project its own Docker or Podman environment. Agents can install dependencies, configure tools, and modify their environment without polluting your base system or interfering with other projects.

Isolation also makes hands-off agent workflows more practical by limiting destructive operations to the project workspace and explicitly mounted resources.

[Website](https://container.aerovato.com) · [Agent Skill](skills/container/SKILL.md)

## Quickstart

### Requirements

- Windows, macOS, or Linux
- Docker or Podman

### Install

macOS and Linux:

```bash
curl -fsSL https://container.aerovato.com/install.sh | sh
```

Windows PowerShell:

```powershell
irm https://container.aerovato.com/install.ps1 | iex
```

Alternatively, install through npm:

```bash
npm install -g @aerovato/container
```

### Configure

Run the guided onboarding flow:

```bash
container init
```

Choose your coding harnesses, development tools, runtime, and mounts, then accept the initial image build.

### Run

Navigate to a project and start its workspace:

```bash
cd /path/to/project
container
```

Your project is mounted at `/root/<project-name>`. The container and anything installed inside it persist between sessions.

Start your preferred coding agent and work normally:

```bash
opencode
npm install <package>
```

## Agent Skill

Want an agent to configure Container for you? Install the portable [Container skill](skills/container/SKILL.md) on the host, then ask your agent to set up packages, harnesses, tools, mounts, permissions, or migrations.

```bash
npx skills add aerovato/container --skill container
npx skills add aerovato/container --skill container --global  # All projects
```

The skill is host-side because agents inside managed containers cannot access Container's host configuration.

## Common Commands

```bash
container                           # Open the current project's workspace
container run /path/to/project      # Open a specific project
container run /path -- -p 8080:80   # Pass runtime flags
container list                      # List managed containers
container stop                      # Stop the current workspace
container remove                    # Remove the current workspace
container settings                  # Change common settings
container init                      # Re-run onboarding
```

Rebuild the shared image when updating tools or customizations:

```bash
container build
container build tools
container build harness
container build user
```

## Customization

Add packages and setup commands to:

```text
~/.code-container/Dockerfile.User
```

Then rebuild the user layer:

```bash
container build user
```

Harnesses, tools, runtime flags, mounts, and base-image settings are configured through `~/.code-container/settings.json`.

See [Configuration](skills/container/references/configuration.md) for settings details and [Permissions](skills/container/references/permissions.md) for hands-off harness permissions.

## Security

`container` limits what an agent can access, but it does not make the agent trusted.

The current project is mounted read-write and can be changed or deleted. Enabled configurations and optional credentials may also be available inside the container. Containers retain network access, and `container` does not protect against prompt injection or agent misalignment.

Keep important work under version control and only mount resources the agent needs.

## License

[BSD 3-Clause](LICENSE.md)
