import { ToolPack } from "./types";

export const TOOL_PACKS = {
  "npm-config": {
    id: "npm-config",
    name: "npm Config",
    detectCommand: "which npm",
    dockerfileLines: [],
    config: [
      { host: "~/.npm", config: ".npm", mount: "/root/.npm" },
      { host: "~/.npmrc", config: ".npmrc", mount: "/root/.npmrc" },
    ],
  },
  "git-config": {
    id: "git-config",
    name: "Git Config",
    detectCommand: "which git",
    dockerfileLines: [],
    config: [
      { host: "~/.gitconfig", config: ".gitconfig", mount: "/root/.gitconfig" },
      {
        host: "~/.gitignore_global",
        config: ".gitignore_global",
        mount: "/root/.gitignore_global",
      },
    ],
  },
  "vim-config": {
    id: "vim-config",
    name: "Vim Config",
    detectCommand: "which vim",
    dockerfileLines: [],
    config: [
      { host: "~/.vimrc", config: ".vimrc", mount: "/root/.vimrc" },
      { host: "~/.vim", config: ".vim", mount: "/root/.vim" },
    ],
  },
  bun: {
    id: "bun",
    name: "Bun",
    detectCommand: "which bun",
    dockerfileLines: [
      "RUN curl -fsSL https://bun.sh/install | bash",
      "RUN echo 'export PATH=\"$HOME/.bun/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [
      { host: "~/.bun", config: ".bun", mount: "/root/.bun" },
      {
        host: "~/.bunfig.toml",
        config: ".bunfig.toml",
        mount: "/root/.bunfig.toml",
      },
    ],
  },
  deno: {
    id: "deno",
    name: "Deno",
    detectCommand: "which deno",
    dockerfileLines: [
      "RUN curl -fsSL https://deno.land/install.sh | sh",
      "RUN echo 'export PATH=\"$HOME/.deno/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [{ host: "~/.deno", config: ".deno", mount: "/root/.deno" }],
  },
  rust: {
    id: "rust",
    name: "Rust",
    detectCommand: "which rustup",
    dockerfileLines: [
      "RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
      "RUN echo 'export PATH=\"$HOME/.cargo/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [
      { host: "~/.cargo", config: ".cargo", mount: "/root/.cargo" },
      { host: "~/.rustup", config: ".rustup", mount: "/root/.rustup" },
    ],
  },
  go: {
    id: "go",
    name: "Go",
    detectCommand: "which go",
    dockerfileLines: ["RUN apt-get update && apt-get install -y golang"],
    config: [
      { host: "~/go", config: "go", mount: "/root/go" },
      { host: "~/.config/go", config: ".config/go", mount: "/root/.config/go" },
    ],
  },
  python: {
    id: "python",
    name: "Python",
    detectCommand: "which python3",
    dockerfileLines: [
      "RUN apt-get update && apt-get install -y python3 python3-dev python3-venv python3-pip",
      "RUN ln -sf /usr/bin/python3 /usr/bin/python",
    ],
    config: [],
  },
  uv: {
    id: "uv",
    name: "uv (Python)",
    detectCommand: "which uv",
    dockerfileLines: [
      "RUN curl -LsSf https://astral.sh/uv/install.sh | sh",
      "RUN echo 'export PATH=\"$HOME/.local/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [],
  },
  gh: {
    id: "gh",
    name: "GitHub CLI",
    detectCommand: "which gh",
    dockerfileLines: ["RUN apt-get update && apt-get install -y gh"],
    config: [
      { host: "~/.config/gh", config: ".config/gh", mount: "/root/.config/gh" },
    ],
  },
  aws: {
    id: "aws",
    name: "AWS CLI",
    detectCommand: "which aws",
    dockerfileLines: [
      'RUN ARCH=$(uname -m) && if [ "$ARCH" = "aarch64" ]; then AWS_ARCH="aarch64"; else AWS_ARCH="x86_64"; fi && curl "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_ARCH}.zip" -o "awscliv2.zip" && unzip awscliv2.zip && ./aws/install && rm -rf aws awscliv2.zip',
    ],
    config: [{ host: "~/.aws", config: ".aws", mount: "/root/.aws" }],
  },
  gcloud: {
    id: "gcloud",
    name: "Google Cloud CLI",
    detectCommand: "which gcloud",
    dockerfileLines: [
      'RUN ARCH=$(uname -m) && if [ "$ARCH" = "aarch64" ]; then GCLOUD_ARCH="arm"; else GCLOUD_ARCH="x86_64"; fi && curl -O "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-${GCLOUD_ARCH}.tar.gz" && tar -xf "google-cloud-cli-linux-${GCLOUD_ARCH}.tar.gz" && ./google-cloud-sdk/install.sh --quiet && rm "google-cloud-cli-linux-${GCLOUD_ARCH}.tar.gz"',
      "RUN echo 'export PATH=\"/root/google-cloud-sdk/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [
      {
        host: "~/.config/gcloud",
        config: ".config/gcloud",
        mount: "/root/.config/gcloud",
      },
    ],
  },
  azure: {
    id: "azure",
    name: "Azure CLI",
    detectCommand: "which az",
    dockerfileLines: ["RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash"],
    config: [{ host: "~/.azure", config: ".azure", mount: "/root/.azure" }],
  },
  kubectl: {
    id: "kubectl",
    name: "kubectl",
    detectCommand: "which kubectl",
    dockerfileLines: [
      'RUN ARCH=$(uname -m) && if [ "$ARCH" = "aarch64" ]; then KUBE_ARCH="arm64"; else KUBE_ARCH="amd64"; fi && curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/${KUBE_ARCH}/kubectl" && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl && rm kubectl',
    ],
    config: [{ host: "~/.kube", config: ".kube", mount: "/root/.kube" }],
  },
  neovim: {
    id: "neovim",
    name: "Neovim",
    detectCommand: "which nvim",
    dockerfileLines: ["RUN apt-get update && apt-get install -y neovim"],
    config: [
      {
        host: "~/.config/nvim",
        config: ".config/nvim",
        mount: "/root/.config/nvim",
      },
      {
        host: "~/.local/share/nvim",
        config: ".local/share/nvim",
        mount: "/root/.local/share/nvim",
      },
      {
        host: "~/.local/state/nvim",
        config: ".local/state/nvim",
        mount: "/root/.local/state/nvim",
      },
      {
        host: "~/.cache/nvim",
        config: ".cache/nvim",
        mount: "/root/.cache/nvim",
      },
    ],
  },
  nano: {
    id: "nano",
    name: "Nano",
    detectCommand: "which nano",
    dockerfileLines: ["RUN apt-get update && apt-get install -y nano"],
    config: [{ host: "~/.nanorc", config: ".nanorc", mount: "/root/.nanorc" }],
  },
  "enhanced-tools": {
    id: "enhanced-tools",
    name: "Enhanced Tools (fd, bat, fzf, ripgrep, eza, git-lfs, jq)",
    detectCommand: "which rg",
    dockerfileLines: [
      "RUN apt-get update && apt-get install -y fd-find bat fzf ripgrep eza git-lfs jq",
      "RUN ln -sf /usr/bin/fdfind /usr/local/bin/fd",
      "RUN ln -sf /usr/bin/batcat /usr/local/bin/bat",
    ],
    config: [
      { host: "~/.ripgreprc", config: ".ripgreprc", mount: "/root/.ripgreprc" },
      {
        host: "~/.config/bat",
        config: ".config/bat",
        mount: "/root/.config/bat",
      },
    ],
  },
} as const satisfies Record<string, ToolPack>;
