import { printInfo } from "../utils";
import { Runtime } from "../runtime";

export function listCommand(runtime: Runtime): void {
  printInfo("Containers:");
  runtime.listContainers(
    "name=container-",
    "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}",
  );
}
