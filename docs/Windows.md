# Windows Support

`container` runs natively on Windows alongside Linux, macOS, and WSL.

## Requirements

- Docker Desktop for Windows (or Podman)
- Windows 10/11, or WSL2

No extra setup is needed. `container` auto-detects your runtime and detects installed harnesses and tools exactly as on POSIX systems.

## Caveats

### Tool and Harness Config Paths

Config locations for harnesses and tools are defined with POSIX-style paths (e.g. `~/.config/opencode`). `container` expands these against your Windows home directory, so configs at those locations migrate automatically.

HOWEVER: If a tool stores its config elsewhere on Windows (for example under `%APPDATA%`), that specific config will not be auto-migrated. The container itself still runs normally; copy such configs manually into `~/.code-container/configs/` if needed.

### UNC Paths

UNC paths (`\\server\share\...`) are not supported as project directories.

## WSL Users

If you run `container` from inside WSL, it behaves exactly as on Linux. The same project maps to the same container whether you access it from WSL or native Windows.
