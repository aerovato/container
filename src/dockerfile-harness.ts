import { HARNESS_PACKS } from "./harness-packs";
import { TOOLS_IMAGE } from "./dockerfile-core";

export function generateDockerfileHarness(enabledIds: string[]): string {
  const sections: string[] = [];
  sections.push(`FROM ${TOOLS_IMAGE}`);
  sections.push(`LABEL aerovato.container=v3`);

  for (const id of enabledIds) {
    const pack = HARNESS_PACKS[id as keyof typeof HARNESS_PACKS];
    if (pack) {
      sections.push(...pack.dockerfileLines);
    }
  }

  return sections.join("\n") + "\n";
}
