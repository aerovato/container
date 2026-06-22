import * as clack from "@clack/prompts";
import { ContainerClient } from "../container-client";
import { resolveContainerName } from "../platform/paths";

export function stopCommand(
  runtime: ContainerClient,
  target: string | undefined,
): void {
  const containerName = resolveContainerName(target);

  if (!runtime.containerExists(containerName)) {
    clack.log.error(`Container does not exist: ${containerName}`);
    process.exit(1);
  }

  if (runtime.containerRunning(containerName)) {
    clack.log.info(`Stopping container: ${containerName}`);
    runtime.stop(containerName);
    clack.log.success("Container stopped");
  } else {
    clack.log.warn(`Container is not running: ${containerName}`);
  }
}
