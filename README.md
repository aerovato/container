<p align="center">
  <img src="https://raw.githubusercontent.com/aerovato/container/main/.github/README/banner.jpg" alt="Container by Aerovato Research" />
</p>

> ##### Built with [Operator Memory](https://github.com/aerovato/operator-memory)

# `container`

Persistent Linux workspaces for software development.

`container` gives each project its own Docker or Podman environment, with coding harnesses and development tools already installed. Workspaces persist across sessions, including packages and configuration. Agents are isolated to that project with no access to the rest of your system.

The same Linux environment runs on Windows, macOS, and Linux. Your `container` is local and open source, does not require an account, and is yours to customize.

[Website](https://container.aerovato.com) · [Agent Skill](skills/container/SKILL.md) · [中文](README.cn.md)

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

Multiple terminals can enter the same container.

## Customization

`container` is infinitely customizable. Add packages and setup commands to the user layer:

```text
~/.code-container/Dockerfile.User
```

Then rebuild it:

```bash
container build user
```

Common settings like tools and harnesses can be configured via `container settings`. More complex options, including runtime flags, mounts, and even base-image settings can be configured through `~/.code-container/settings.json`.

See [Configuration](skills/container/references/configuration.md) for settings details and [Permissions](skills/container/references/permissions.md) for hands-off harness permissions.

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

## Agent Skill

Want an agent to configure Container for you? Install the portable [Container skill](skills/container/SKILL.md) on the host, then ask your agent to set up packages, harnesses, tools, mounts, permissions, or migrations.

```bash
npx skills add aerovato/container --skill container
npx skills add aerovato/container --skill container --global  # All projects
```

The skill is host-side because agents inside managed containers cannot access Container's host configuration.

## Security

`container` limits what an agent can access, but it does not make the agent trusted.

The current project is mounted read-write and can be changed or deleted. Enabled configurations and optional credentials may also be available inside the container. Containers retain network access, and `container` does not protect against prompt injection or agent misalignment.

Keep important work under version control and only mount resources the agent needs.

## Built with Operator

This repository is maintained with [Operator Memory](https://github.com/aerovato/operator-memory) — durable, agent-maintained documentation that lets AI agents work on the project with full context across sessions. The published brain lives in [`.operator-shared/`](.operator-shared/).

To work on Container with the same context, [we recommend installing Operator Memory.](https://github.com/aerovato/operator-memory#install-operator)

## License

[BSD 3-Clause](LICENSE.md)
