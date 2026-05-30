import * as clack from "@clack/prompts";
import { Runtime } from "../runtime";

export function listCommand(runtime: Runtime): void {
  clack.log.info("Containers:");
  runtime.listContainers(
    "name=container-",
    "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}",
  );
}
