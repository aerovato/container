import { ToolPack } from "./types";
import { commandExists } from "./platform/shell";

export const TOOL_PACKS = {
  python: {
    id: "python",
    name: "Python",
    shouldEnable: () => true,
    dockerfileLines: [
      "RUN apt-get update && apt-get install -y python3 python3-dev python3-venv python3-pip",
      "RUN ln -sf /usr/bin/python3 /usr/bin/python",
    ],
    config: [],
  },
  bun: {
    id: "bun",
    name: "Bun",
    shouldEnable: () => true,
    dockerfileLines: [
      "RUN curl -fsSL https://bun.sh/install | bash",
      "RUN echo 'export PATH=\"$HOME/.bun/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [
      {
        host: "~/.bun",
        config: ".bun",
        mount: "/root/.bun",
        kind: "directory",
      },
      {
        host: "~/.bunfig.toml",
        config: ".bunfig.toml",
        mount: "/root/.bunfig.toml",
        kind: "file",
      },
    ],
  },
  "enhanced-tools": {
    id: "enhanced-tools",
    name: "Enhanced Tools (fd, bat, fzf, ripgrep, eza, git-lfs, jq)",
    shouldEnable: () => true,
    dockerfileLines: [
      "RUN apt-get update && apt-get install -y fd-find bat fzf ripgrep eza git-lfs jq",
      "RUN ln -sf /usr/bin/fdfind /usr/local/bin/fd",
      "RUN ln -sf /usr/bin/batcat /usr/local/bin/bat",
    ],
    config: [
      {
        host: "~/.ripgreprc",
        config: ".ripgreprc",
        mount: "/root/.ripgreprc",
        kind: "file",
      },
      {
        host: "~/.config/bat",
        config: ".config/bat",
        mount: "/root/.config/bat",
        kind: "directory",
      },
    ],
  },
  "agents-directory": {
    id: "agents-directory",
    name: "Agents Directory (~/.agents)",
    shouldEnable: () => true,
    dockerfileLines: [],
    config: [
      {
        host: "~/.agents",
        config: ".agents",
        mount: "/root/.agents",
        kind: "directory",
      },
    ],
  },
  "npm-config": {
    id: "npm-config",
    name: "Npm Config",
    shouldEnable: () => true,
    dockerfileLines: [],
    config: [
      {
        host: "~/.npm",
        config: ".npm",
        mount: "/root/.npm",
        kind: "directory",
      },
      {
        host: "~/.npmrc",
        config: ".npmrc",
        mount: "/root/.npmrc",
        kind: "file",
      },
    ],
  },
  "git-config": {
    id: "git-config",
    name: "Git Config",
    shouldEnable: () => true,
    dockerfileLines: [],
    config: [
      {
        host: "~/.gitconfig",
        config: ".gitconfig",
        mount: "/root/.gitconfig",
        kind: "file",
      },
      {
        host: "~/.gitignore_global",
        config: ".gitignore_global",
        mount: "/root/.gitignore_global",
        kind: "file",
      },
    ],
  },
  "vim-config": {
    id: "vim-config",
    name: "Vim Config",
    shouldEnable: () => true,
    dockerfileLines: [],
    config: [
      {
        host: "~/.vimrc",
        config: ".vimrc",
        mount: "/root/.vimrc",
        kind: "file",
      },
      {
        host: "~/.vim",
        config: ".vim",
        mount: "/root/.vim",
        kind: "directory",
      },
    ],
  },
  deno: {
    id: "deno",
    name: "Deno",
    shouldEnable: exec => commandExists(exec, "deno"),
    dockerfileLines: [
      "RUN curl -fsSL https://deno.land/install.sh | sh",
      "RUN echo 'export PATH=\"$HOME/.deno/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [
      {
        host: "~/.deno",
        config: ".deno",
        mount: "/root/.deno",
        kind: "directory",
      },
    ],
  },
  rust: {
    id: "rust",
    name: "Rust",
    shouldEnable: exec => commandExists(exec, "rustup"),
    dockerfileLines: [
      "RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
      "RUN echo 'export PATH=\"$HOME/.cargo/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [
      {
        host: "~/.cargo",
        config: ".cargo",
        mount: "/root/.cargo",
        kind: "directory",
      },
      {
        host: "~/.rustup",
        config: ".rustup",
        mount: "/root/.rustup",
        kind: "directory",
      },
    ],
  },
  go: {
    id: "go",
    name: "Go",
    shouldEnable: exec => commandExists(exec, "go"),
    dockerfileLines: ["RUN apt-get update && apt-get install -y golang"],
    config: [
      { host: "~/go", config: "go", mount: "/root/go", kind: "directory" },
      {
        host: "~/.config/go",
        config: ".config/go",
        mount: "/root/.config/go",
        kind: "directory",
      },
    ],
  },
  uv: {
    id: "uv",
    name: "uv (Python)",
    shouldEnable: exec => commandExists(exec, "uv"),
    dockerfileLines: [
      "RUN curl -LsSf https://astral.sh/uv/install.sh | sh",
      "RUN echo 'export PATH=\"$HOME/.local/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [],
  },
  gh: {
    id: "gh",
    name: "GitHub CLI",
    shouldEnable: exec => commandExists(exec, "gh"),
    dockerfileLines: ["RUN apt-get update && apt-get install -y gh"],
    config: [
      {
        host: "~/.config/gh",
        config: ".config/gh",
        mount: "/root/.config/gh",
        kind: "directory",
      },
    ],
  },
  aws: {
    id: "aws",
    name: "AWS CLI",
    shouldEnable: exec => commandExists(exec, "aws"),
    dockerfileLines: [
      'RUN ARCH=$(uname -m) && if [ "$ARCH" = "aarch64" ]; then AWS_ARCH="aarch64"; else AWS_ARCH="x86_64"; fi && curl "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_ARCH}.zip" -o "awscliv2.zip" && unzip awscliv2.zip && ./aws/install && rm -rf aws awscliv2.zip',
    ],
    config: [
      {
        host: "~/.aws",
        config: ".aws",
        mount: "/root/.aws",
        kind: "directory",
      },
    ],
  },
  gcloud: {
    id: "gcloud",
    name: "Google Cloud CLI",
    shouldEnable: exec => commandExists(exec, "gcloud"),
    dockerfileLines: [
      'RUN ARCH=$(uname -m) && if [ "$ARCH" = "aarch64" ]; then GCLOUD_ARCH="arm"; else GCLOUD_ARCH="x86_64"; fi && curl -O "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-${GCLOUD_ARCH}.tar.gz" && tar -xf "google-cloud-cli-linux-${GCLOUD_ARCH}.tar.gz" && ./google-cloud-sdk/install.sh --quiet && rm "google-cloud-cli-linux-${GCLOUD_ARCH}.tar.gz"',
      "RUN echo 'export PATH=\"/root/google-cloud-sdk/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [
      {
        host: "~/.config/gcloud",
        config: ".config/gcloud",
        mount: "/root/.config/gcloud",
        kind: "directory",
      },
    ],
  },
  azure: {
    id: "azure",
    name: "Azure CLI",
    shouldEnable: exec => commandExists(exec, "az"),
    dockerfileLines: ["RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash"],
    config: [
      {
        host: "~/.azure",
        config: ".azure",
        mount: "/root/.azure",
        kind: "directory",
      },
    ],
  },
  neovim: {
    id: "neovim",
    name: "Neovim",
    shouldEnable: exec => commandExists(exec, "nvim"),
    dockerfileLines: ["RUN apt-get update && apt-get install -y neovim"],
    config: [
      {
        host: "~/.config/nvim",
        config: ".config/nvim",
        mount: "/root/.config/nvim",
        kind: "directory",
      },
      {
        host: "~/.local/share/nvim",
        config: ".local/share/nvim",
        mount: "/root/.local/share/nvim",
        kind: "directory",
      },
      {
        host: "~/.local/state/nvim",
        config: ".local/state/nvim",
        mount: "/root/.local/state/nvim",
        kind: "directory",
      },
      {
        host: "~/.cache/nvim",
        config: ".cache/nvim",
        mount: "/root/.cache/nvim",
        kind: "directory",
      },
    ],
  },
} as const satisfies Record<string, ToolPack>;
