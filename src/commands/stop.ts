import { printInfo, printSuccess, printWarning, printError } from "../utils";
import { Runtime } from "../runtime";
import { resolveContainerTarget } from "./shared";

export function stopCommand(
  runtime: Runtime,
  target: string | undefined,
): void {
  const containerName = resolveContainerTarget(target);

  if (!runtime.containerExists(containerName)) {
    printError(`Container does not exist: ${containerName}`);
    process.exit(1);
  }

  if (runtime.containerRunning(containerName)) {
    printInfo(`Stopping container: ${containerName}`);
    runtime.stop(containerName);
    printSuccess("Container stopped");
  } else {
    printWarning(`Container is not running: ${containerName}`);
  }
}
