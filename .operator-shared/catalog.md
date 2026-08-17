# Shared Partition Catalog

## Tree

- `operator.md`
  - Description: Operator Instructions for this partition (project-wide workflow, rules, style, share policy).
  - Read If: Auto-injected.
- `catalog.md`
  - Description: This catalog.
  - Read If: Auto-injected.
- `README.md`
  - Description: Operator Memory README for collaborators.
  - Read If: New collaborator onboarding.
- `index/`
  - Description: Main shared Project Index (to be populated via `/operator:index`).
  - Read If: Before navigating or searching the codebase.

### `specs/` — Public system contracts

- `architecture.md`
  - Description: High-level system architecture and data flows.
  - Read If: Before any feature work; links to other specs for details.
- `cli.md`
  - Description: Commands, arguments, and path/flag handling.
  - Read If: Changing command routing or argument parsing.
- `configuration.md`
  - Description: `settings.json` keys and their runtime behavior.
  - Read If: Adding or changing settings.
- `build.md`
  - Description: Build targets, image pipeline, and staleness detection.
  - Read If: Changing the build system.
- `tool-packs.md`
  - Description: Tool packs registry, defaults, build integration, and mounts.
  - Read If: Adding or changing tool packs.
- `onboarding.md`
  - Description: TOS gate and onboarding flows (Express and Custom).
  - Read If: Changing first-run or init behavior.
- `windows.md`
  - Description: Native Windows support: platform abstraction, path canonicalization, mounts, runtime, caveats.
  - Read If: Touching `src/platform/` or cross-OS behavior.
- `testing.md`
  - Description: Testing guidelines and conventions (Result type, DI, memfs mocks).
  - Read If: Writing or changing tests.
