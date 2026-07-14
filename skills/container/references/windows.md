# Windows Support

Aerovato Container runs natively on Windows alongside Linux, macOS, and WSL.

## Requirements

- Windows 10 or 11, or WSL2
- Docker Desktop for Windows or Podman

No extra compatibility layer is required for native Windows. Container detects supported runtimes, harnesses, and tools during onboarding.

## Config Paths

Harness and tool definitions use POSIX-style paths such as `~/.config/opencode`. Container expands these against the Windows home directory.

When a Windows application stores configuration elsewhere, such as `%APPDATA%`, automatic migration may not find it. Copy the required configuration into the corresponding location under `~/.code-container/configs/` only with user approval.

## Project Paths

UNC project paths such as `\\server\share\project` are not supported.

Container canonicalizes Windows drive paths so native Windows and WSL access to the same project resolve to the same managed container.

## WSL

When invoked inside WSL, Container follows Linux behavior. Use paths visible to the selected runtime and avoid mixing inaccessible Windows and WSL mount sources.
