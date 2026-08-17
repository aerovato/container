# V3 Testing & Error Handling

## Result Type

Return structured results instead of throwing errors.

```ts
type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };
```

Usage:

```ts
const result = settings.load();
if (!result.ok) {
  printError(result.error);
  return;
}
const data = result.value;
```

Error categories:

- Settings: `"invalid_json"` / `"validation_failed"`
- Runtime: `"command_failed"` + stderr message
- File ops: `"not_found"` / `"permission_denied"`

## Class Encapsulation

Encapsulate stateful components for dependency injection. Interfaces follow Node API subset.

### SettingsStore / StateStore

Use `Filesystem` (wraps a `FsReader` subset of fs) for DI. `load()` / `save()` return `Result`.

### ContainerClient

```ts
class ContainerClient {
  constructor(exec: Executor, bin: "docker" | "podman");

  imageExists(name: string): boolean;
  containerExists(name: string): boolean;
  containerRunning(name: string): boolean;
  build(dockerfilePath: string, tag: string, context: string): Result<void>;
  run(args: string[]): Result<void>;
  exec(args: string[]): Result<void>;
  attachedSessionCount(name: string): number;
  // ... other lifecycle methods (void or Result as appropriate)
}
```

## Dependency Injection

Inject a `Filesystem` (wrapping memfs) and an `Executor` (`{ spawnSync }`, or mocks) into constructors.

## Test Approach

Use memfs + mock executor. Instantiate classes with mocks; assert on `Result` and side effects. Pure functions (e.g. dockerfile generators, `buildBindMount`) tested directly. Platform branching is exercised by overriding `process.platform` in tests.
