import { TOOL_PACKS } from "./tool-packs";
import { CORE_IMAGE } from "./dockerfile-core";

export function generateDockerfileTools(enabledIds: string[]): string {
  const sections: string[] = [];
  sections.push(`FROM ${CORE_IMAGE}`);
  sections.push(`LABEL aerovato.container=v3`);

  for (const id of enabledIds) {
    const pack = TOOL_PACKS[id as keyof typeof TOOL_PACKS];
    if (pack) {
      sections.push(...pack.dockerfileLines);
    }
  }

  return sections.join("\n") + "\n";
}
