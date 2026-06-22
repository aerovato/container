import * as clack from "@clack/prompts";
import { ContainerClient } from "../container-client";

export function listCommand(runtime: ContainerClient): void {
  clack.log.info("Containers:");
  runtime.listContainers(
    "name=container-",
    "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}",
  );
}
