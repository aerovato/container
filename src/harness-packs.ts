import { HarnessPack } from "./types";
import { commandExists } from "./platform/shell";

export const HARNESS_PACKS = {
  claude: {
    id: "claude",
    name: "Claude Code",
    shouldEnable: exec => commandExists(exec, "claude"),
    dockerfileLines: [
      "RUN curl -fsSL https://claude.ai/install.sh | bash",
      "RUN echo 'export PATH=\"$HOME/.local/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [
      {
        host: "~/.claude",
        config: ".claude",
        mount: "/root/.claude",
        kind: "directory",
      },
      {
        host: "~/.claude.json",
        config: ".claude.json",
        mount: "/root/.claude.json",
        kind: "file",
        defaultContents: "{}\n",
      },
      {
        host: "~/.local/state/claude",
        config: ".local/state/claude",
        mount: "/root/.local/state/claude",
        kind: "directory",
      },
      {
        host: "~/.local/share/claude",
        config: ".local/share/claude",
        mount: "/root/.local/share/claude",
        kind: "directory",
      },
    ],
  },
  opencode: {
    id: "opencode",
    name: "OpenCode",
    shouldEnable: exec => commandExists(exec, "opencode"),
    dockerfileLines: ["RUN npm install -g opencode-ai"],
    config: [
      {
        host: "~/.config/opencode",
        config: ".opencode",
        mount: "/root/.config/opencode",
        kind: "directory",
      },
      {
        host: "~/.local/state/opencode",
        config: ".local/state/opencode",
        mount: "/root/.local/state/opencode",
        kind: "directory",
      },
      {
        host: "~/.local/share/opencode",
        config: ".local/share/opencode",
        mount: "/root/.local/share/opencode",
        kind: "directory",
      },
      {
        host: "~/.local/share/opentui",
        config: ".local/share/opentui",
        mount: "/root/.local/share/opentui",
        kind: "directory",
      },
    ],
  },
  codex: {
    id: "codex",
    name: "OpenAI Codex",
    shouldEnable: exec => commandExists(exec, "codex"),
    dockerfileLines: ["RUN npm install -g @openai/codex"],
    config: [
      {
        host: "~/.codex",
        config: ".codex",
        mount: "/root/.codex",
        kind: "directory",
      },
    ],
  },
  pi: {
    id: "pi",
    name: "Pi",
    shouldEnable: exec => commandExists(exec, "pi"),
    dockerfileLines: ["RUN npm install -g @earendil-works/pi-coding-agent"],
    config: [
      {
        host: "~/.pi",
        config: ".pi",
        mount: "/root/.pi",
        kind: "directory",
      },
    ],
  },
  gemini: {
    id: "gemini",
    name: "Gemini CLI",
    shouldEnable: exec => commandExists(exec, "gemini"),
    dockerfileLines: ["RUN npm install -g @google/gemini-cli"],
    config: [
      {
        host: "~/.gemini",
        config: ".gemini",
        mount: "/root/.gemini",
        kind: "directory",
      },
    ],
  },
  copilot: {
    id: "copilot",
    name: "GitHub Copilot CLI",
    shouldEnable: exec => commandExists(exec, "copilot"),
    dockerfileLines: ["RUN npm install -g @github/copilot"],
    config: [
      {
        host: "~/.copilot",
        config: ".copilot",
        mount: "/root/.copilot",
        kind: "directory",
      },
    ],
  },
  grok: {
    id: "grok",
    name: "Grok Build",
    shouldEnable: exec => commandExists(exec, "grok"),
    dockerfileLines: [
      "RUN curl -fsSL https://x.ai/cli/install.sh | bash",
      "RUN echo 'export PATH=\"$HOME/.local/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [
      {
        host: "~/.grok",
        config: ".grok",
        mount: "/root/.grok",
        kind: "directory",
      },
    ],
  },
  cursor: {
    id: "cursor",
    name: "Cursor CLI",
    shouldEnable: exec => commandExists(exec, "cursor-agent"),
    dockerfileLines: ["RUN curl https://cursor.com/install -fsS | bash"],
    config: [
      {
        host: "~/.cursor",
        config: ".cursor",
        mount: "/root/.cursor",
        kind: "directory",
      },
      {
        host: "~/.config/cursor",
        config: ".config/cursor",
        mount: "/root/.config/cursor",
        kind: "directory",
      },
      {
        host: "~/.local/share/cursor-agent",
        config: ".local/share/cursor-agent",
        mount: "/root/.local/share/cursor-agent",
        kind: "directory",
      },
    ],
  },
  nitro: {
    id: "nitro",
    name: "Aerovato Nitro",
    shouldEnable: exec => commandExists(exec, "nitro"),
    dockerfileLines: ["RUN npm install -g @aerovato/nitro"],
    config: [
      {
        host: "~/.nitro",
        config: ".nitro",
        mount: "/root/.nitro",
        kind: "directory",
      },
    ],
  },
  antigravity: {
    id: "antigravity",
    name: "Antigravity CLI",
    shouldEnable: exec => commandExists(exec, "agy"),
    dockerfileLines: [
      "RUN curl -fsSL https://antigravity.google/cli/install.sh | bash",
      "RUN echo 'export PATH=\"$HOME/.local/bin:$PATH\"' >> ~/.bashrc",
    ],
    config: [
      {
        host: "~/.gemini/antigravity-cli",
        config: ".gemini/antigravity-cli",
        mount: "/root/.gemini/antigravity-cli",
        kind: "directory",
      },
    ],
  },
} as const satisfies Record<string, HarnessPack>;
