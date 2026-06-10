import { HarnessPack } from "./types";

export const HARNESS_PACKS = {
  claude: {
    id: "claude",
    name: "Claude Code",
    detectCommand: "which claude",
    dockerfileLines: [
      "RUN curl -fsSL https://claude.ai/install.sh | bash",
      "RUN echo 'export PATH=\"$HOME/.local/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [
      { host: "~/.claude", config: ".claude", mount: "/root/.claude" },
      {
        host: "~/.claude.json",
        config: ".claude.json",
        mount: "/root/.claude.json",
      },
      {
        host: "~/.local/state/claude",
        config: ".local/state/claude",
        mount: "/root/.local/state/claude",
      },
      {
        host: "~/.local/share/claude",
        config: ".local/share/claude",
        mount: "/root/.local/share/claude",
      },
    ],
  },
  opencode: {
    id: "opencode",
    name: "OpenCode",
    detectCommand: "which opencode",
    dockerfileLines: ["RUN npm install -g opencode-ai"],
    config: [
      {
        host: "~/.config/opencode",
        config: ".opencode",
        mount: "/root/.config/opencode",
      },
      {
        host: "~/.local/state/opencode",
        config: ".local/state/opencode",
        mount: "/root/.local/state/opencode",
      },
      {
        host: "~/.local/share/opencode",
        config: ".local/share/opencode",
        mount: "/root/.local/share/opencode",
      },
      {
        host: "~/.local/share/opentui",
        config: ".local/share/opentui",
        mount: "/root/.local/share/opentui",
      },
    ],
  },
  codex: {
    id: "codex",
    name: "OpenAI Codex",
    detectCommand: "which codex",
    dockerfileLines: ["RUN npm install -g @openai/codex"],
    config: [{ host: "~/.codex", config: ".codex", mount: "/root/.codex" }],
  },
  gemini: {
    id: "gemini",
    name: "Gemini CLI",
    detectCommand: "which gemini",
    dockerfileLines: ["RUN npm install -g @google/gemini-cli"],
    config: [{ host: "~/.gemini", config: ".gemini", mount: "/root/.gemini" }],
  },
  copilot: {
    id: "copilot",
    name: "GitHub Copilot CLI",
    detectCommand: "which copilot",
    dockerfileLines: ["RUN npm install -g @github/copilot"],
    config: [
      { host: "~/.copilot", config: ".copilot", mount: "/root/.copilot" },
    ],
  },
  grok: {
    id: "grok",
    name: "Grok Build",
    detectCommand: "which grok",
    dockerfileLines: [
      "RUN curl -fsSL https://x.ai/cli/install.sh | bash",
      "RUN echo 'export PATH=\"$HOME/.local/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [{ host: "~/.grok", config: ".grok", mount: "/root/.grok" }],
  },
  cursor: {
    id: "cursor",
    name: "Cursor CLI",
    detectCommand: "which cursor-agent",
    dockerfileLines: ["RUN curl https://cursor.com/install -fsS | bash"],
    config: [
      { host: "~/.cursor", config: ".cursor", mount: "/root/.cursor" },
      {
        host: "~/.config/cursor",
        config: ".config/cursor",
        mount: "/root/.config/cursor",
      },
      {
        host: "~/.local/share/cursor-agent",
        config: ".local/share/cursor-agent",
        mount: "/root/.local/share/cursor-agent",
      },
    ],
  },
  nitro: {
    id: "nitro",
    name: "Aerovato Nitro",
    detectCommand: "which nitro",
    dockerfileLines: ["RUN npm install -g @aerovato/nitro"],
    config: [{ host: "~/.nitro", config: ".nitro", mount: "/root/.nitro" }],
  },
  antigravity: {
    id: "antigravity",
    name: "Antigravity CLI",
    detectCommand: "which agy",
    dockerfileLines: [
      "RUN curl -fsSL https://antigravity.google/cli/install.sh | bash",
      "RUN echo 'export PATH=\"$HOME/.local/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [
      {
        host: "~/.gemini/antigravity-cli",
        config: ".gemini/antigravity-cli",
        mount: "/root/.gemini/antigravity-cli",
      },
    ],
  },
} as const satisfies Record<string, HarnessPack>;
