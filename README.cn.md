<p align="center">
  <img src="https://raw.githubusercontent.com/aerovato/container/main/.github/README/banner.jpg" alt="Container by Aerovato Research" />
</p>

> ##### Built with [Operator Memory](https://github.com/aerovato/operator-memory)

# `container`

面向软件开发的持久化 Linux 工作区。

`container` 为每个项目提供独立的 Docker 或 Podman 环境，并预装编码套件和开发工具。工作区在会话之间持久保留，包括已安装的软件包和配置。Agent 被隔离在该项目中，无法访问系统的其余部分。

同一个 Linux 环境可在 Windows、macOS 和 Linux 上运行。你的 `container` 是本地且开源的，无需账户，完全由你自定义。

[网站](https://container.aerovato.com) · [Agent Skill](skills/container/SKILL.md) · [English](README.md)

## 快速开始

### 环境要求

- Windows、macOS 或 Linux
- Docker 或 Podman

### 安装

macOS 和 Linux：

```bash
curl -fsSL https://container.aerovato.com/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://container.aerovato.com/install.ps1 | iex
```

也可以通过 npm 安装：

```bash
npm install -g @aerovato/container
```

### 配置

运行引导式初始化流程：

```bash
container init
```

选择你的编码套件、开发工具、容器运行时和挂载，然后接受首次镜像构建。

### 运行

进入某个项目并启动它的工作区：

```bash
cd /path/to/project
container
```

你的项目挂载在 `/root/<project-name>`。容器及其内部安装的任何内容都会在会话之间持久保留。

启动你偏好的编码 Agent 并正常工作：

```bash
opencode
npm install <package>
```

多个终端可以进入同一个容器。

## 自定义

`container` 可以无限自定义。向用户层添加软件包和安装命令：

```text
~/.code-container/Dockerfile.User
```

然后重新构建：

```bash
container build user
```

工具和编码套件等常用设置可通过 `container settings` 配置。更复杂的选项，包括运行时标志、挂载，甚至基础镜像设置，都可以通过 `~/.code-container/settings.json` 配置。

详见[配置](skills/container/references/configuration.md)了解设置详情，[权限](skills/container/references/permissions.md)了解免干预的套件权限。

## 常用命令

```bash
container                           # 打开当前项目的工作区
container run /path/to/project      # 打开指定项目
container run /path -- -p 8080:80   # 传递运行时标志
container list                      # 列出受管理的容器
container stop                      # 停止当前工作区
container remove                    # 移除当前工作区
container settings                  # 修改常用设置
container init                      # 重新运行初始化流程
```

更新工具或自定义配置后，重新构建共享镜像：

```bash
container build
container build tools
container build harness
container build user
```

## Agent Skill

想让 Agent 替你配置 Container？在宿主机上安装可移植的 [Container skill](skills/container/SKILL.md)，然后让 Agent 配置软件包、编码套件、工具、挂载、权限或迁移。

```bash
npx skills add aerovato/container --skill container
npx skills add aerovato/container --skill container --global  # 所有项目
```

该 skill 运行在宿主机侧，因为受管容器内的 Agent 无法访问 Container 的宿主机配置。

## 安全性

`container` 限制了 Agent 可访问的范围，但并不会使 Agent 变得可信。

当前项目以读写方式挂载，可能被修改或删除。已启用的配置和可选的凭据也可能在容器内可用。容器保留网络访问权限，且 `container` 无法防范提示词注入或 Agent 失范行为。

请将重要工作纳入版本控制，仅挂载 Agent 所需的资源。

## 基于 Operator 构建

本仓库使用 [Operator Memory](https://github.com/aerovato/operator-memory) 维护——持久化、由 Agent 维护的文档，让 AI Agent 能够在会话之间以完整上下文参与项目开发。已发布的 brain 位于 [`.operator-shared/`](.operator-shared/)。

要以相同上下文参与 Container 开发，[我们推荐安装 Operator Memory。](https://github.com/aerovato/operator-memory#install-operator)

## 许可证

[BSD 3-Clause](LICENSE.md)
