# Onboarding

Onboarding runs automatically on first use or when the recorded onboarding version is outdated. It can also be triggered manually with `container init`.

## TOS Gate

Before any command (except help), the user must accept the current Terms of Service. Acceptance is recorded as a version number. The TOS is shown only until the latest version is accepted.

## Entry

Onboarding opens with an intro. When the reason is `upgrade`, a note explains re-onboarding was triggered by a feature update.

## Runtime Pre-check

Before mode selection, onboarding checks for a container runtime. If Docker or Podman is present, it proceeds silently. If neither is found, it recommends Podman on Linux or Docker Desktop on Windows/macOS and loops three options:

- Install Now — uses the available Linux package manager, Homebrew on macOS, or WinGet on Windows, then re-checks.
- Install Later — displays the applicable installation command and continues with no runtime.
- Skip — continues with no runtime. All other behavior is unchanged (Express skips its build; Custom still runs its runtime select).

## Mode Selection

The user selects a mode (Express or Custom); the onboarding version is stamped immediately after.

## Express Setup

Non-interactive beyond mode selection. Each step runs under a spinner:

1. Detect harnesses — OpenCode is always enabled. Each harness pack's `shouldEnable` runs against the host. If none are detected, defaults are also enabled: Codex, Claude Code.
2. Migrate harness configs — copy each config's host source into `configs/` (skip if source missing or destination present).
3. Detect tools — each tool pack's `shouldEnable`.
4. Migrate tool configs — same copy rule as harness configs.
5. Detect runtime — via default runtime detection.
6. Show a summary (enabled harnesses, enabled tools, migrated config count, runtime, SSH mount = enabled).

Then writes settings (`enabledHarnesses`, `enabledTools`, `runtime`, `systemMounts.ssh = true`) and state (`buildDirty = "harness"`). If a runtime was detected, builds the full image automatically (no prompt).

## Custom Setup

Interactive, step by step:

1. Harness multiselect — all harnesses; initial values are existing `enabledHarnesses` or the auto-detected set.
2. Config migration multiselect (only if harnesses selected) — per-harness status `(Migrated)`/`(Unmigrated)`, optional; selected configs are copied with warnings for missing sources or existing destinations.
3. Tools multiselect — all tools; initial values are existing `enabledTools` or the auto-detected set.
4. Tool config migration (only if tools selected) — same copy rule as Express.
5. Runtime select — Docker or Podman; selecting an uninstalled runtime logs a warning. Initial value is the previously recorded runtime.
6. SSH mount confirm — initial value is existing setting or `true`.

Then writes settings (`enabledHarnesses`, `enabledTools`, `runtime`, `systemMounts.ssh`) and state (`buildDirty = "harness"`). If a runtime is set, prompts to build the full image; builds only on confirmation.

## Shared Behavior

- Any prompt cancellation exits onboarding immediately.
- `buildDirty` is always set to `"harness"`, regardless of what actually changed.
- A failed image build is non-fatal; the user is told to run `container build` manually.
- `.gitconfig` is mounted by default; users can disable it later.
