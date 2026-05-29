import { HARNESS_PACKS } from "./harness-packs";
import { CORE_IMAGE } from "./dockerfile-core";

export function generateDockerfileHarness(enabledIds: string[]): string {
  const sections: string[] = [];
  sections.push(`FROM ${CORE_IMAGE}`);

  for (const id of enabledIds) {
    const pack = HARNESS_PACKS[id as keyof typeof HARNESS_PACKS];
    if (pack) {
      sections.push(...pack.dockerfileLines);
    }
  }

  return sections.join("\n") + "\n";
}
