# Harness Permissions

Use these settings only when the user explicitly asks to reduce or remove harness approval prompts inside managed containers.

Full harness permissions allow an agent to modify or delete the mounted project and any writable mounted configuration. Optional credentials such as SSH or cloud configs may also be accessible. Explain this risk before changing permissions.

Modify only the persisted files under `~/.code-container/configs/`. Do not change the normal host harness configurations for this task.

## OpenCode

File: `~/.code-container/configs/.opencode/opencode.json`

Merge this property into the existing JSON object:

```json
{
  "permission": "allow"
}
```

## OpenAI Codex

File: `~/.code-container/configs/.codex/config.toml`

Set:

```toml
approval_policy = "never"
sandbox_mode = "danger-full-access"
```

Preserve unrelated TOML configuration and avoid duplicate keys.

## Claude Code

File: `~/.code-container/configs/.claude/settings.json`

Merge these properties into the existing JSON object:

```json
{
  "permissions": {
    "allow": ["*", "Bash"]
  }
}
```

Preserve other permission settings unless the user asks to replace them.

## Gemini CLI

File: `~/.code-container/configs/.gemini/policies/rules.toml`

Create the parent directory when needed and add:

```toml
[[rule]]
toolName = ["run_shell_command", "write_file", "replace"]
decision = "allow"
priority = 777
```

Preserve existing rules.

## Applying Changes

These files are bind-mounted, so edits normally become visible without an image rebuild. If the relevant harness was newly enabled after the project container was created, rebuild the harness image and recreate that project container with explicit approval.
