# Shared Operator Instructions

## Workflow

- Run lint (`npx eslint .`) and typecheck (`npx tsc --noEmit`) after implementation; run tests (`npm test`) when touching tested code.
- Run the precommit hook equivalent (`scripts/precommit.sh`) before committing.
- Follow `specs/Testing.md` conventions: `Result` over throwing, DI with injected `Filesystem`/`Executor`, memfs + mock executor in tests.

## Rules

- **Never run the gorelease workflow or bun compile inside the devcontainer; it will not work.**
- All OS-dependent code lives in `src/platform/`; an ESLint rule forbids `os`/`child_process`/`fs` imports and `process.platform`/`process.arch` access elsewhere (escape via `eslint-disable` only when justified).
- Docker/Podman operations go through `ContainerClient` with an injected `Executor`; never call the runtime directly outside it.

## Style

- Markdown: backticks for code; bold only for must-read clauses; no tables, no box-drawing diagrams, no hard-wrapping prose at a column limit.

## Private / Shared Policy

- Shared: main project index (`index/`), project-wide rules and style guides, and specs selected for public development.
- Do not reference private files, paths, or private-only content here.
