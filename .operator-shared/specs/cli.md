# CLI

`container` provides a small set of commands for managing isolated project environments.

## Commands

- `container [PROJECT_PATH] [-- DOCKER_FLAGS...]`  
  Default command. Equivalent to `container run`. Starts or attaches to the container for the given project (defaults to current directory).

- `container run [PROJECT_PATH] [-- DOCKER_FLAGS...]`  
  Create (if missing) and attach. Flags after `--` route contextually: to `docker run` when creating, to `docker exec` when attaching to an existing container.

- `container create [PROJECT_PATH] [-- DOCKER_FLAGS...]`  
  Creates the container if it does not exist; errors if it already exists. Does not attach. Flags after `--` are passed to `docker run`.

- `container attach [PROJECT_PATH] [-- DOCKER_FLAGS...]`  
  Attaches to an existing container; errors if none exists. Does not create. Flags after `--` are passed to `docker exec`.

- `container build [TARGET]`
  Builds the container image. Targets control the scope and whether cached layers can be reused:
  - `full` (default): Rebuilds everything.
  - `tools`: Rebuilds from the tools stage onward.
  - `harness`: Rebuilds from the harness stage onward.
  - `user`: Rebuilds only the final user customization stage.

- `container init`  
  Re-runs the onboarding flow.

- `container settings`
  Interactive menu to modify common settings (enabled harnesses, enabled tools, runtime, system mounts). Prompts to rebuild if harness or tool selection changes.

- `container stop [PROJECT_PATH]`  
  Stops the container for the project if it is running.

- `container remove [PROJECT_PATH]`  
  Stops (if running) and removes the container for the project.

- `container list`  
  Lists all managed containers with basic status.

## Argument Handling

- Project paths are resolved relative to the current working directory when relative or omitted.
- The `--` separator cleanly separates `container` arguments from flags intended for the container runtime.
- Invalid commands or build targets produce an error and exit.

Help is available via `container --help` (or the `help` command). It bypasses TOS and onboarding.
