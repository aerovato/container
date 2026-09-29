import { TOOL_PACKS } from "./tool-packs";
import { CORE_IMAGE } from "./dockerfile-core";

/**
 * Install-order priorities (lower = earlier). Essential runtimes install before
 * everything else; unknown packs install last in settings order.
 */
const TOOL_PRIORITY: Partial<Record<keyof typeof TOOL_PACKS, number>> = {
  python: 10,
  bun: 20,
  "enhanced-tools": 30,
};

export function generateDockerfileTools(enabledIds: string[]): string {
  const sections: string[] = [];
  sections.push(`FROM ${CORE_IMAGE}`);
  sections.push(`LABEL aerovato.container=v3`);

  const packs = enabledIds
    .map(id => TOOL_PACKS[id as keyof typeof TOOL_PACKS])
    .filter(pack => pack !== undefined)
    .sort(
      (a, b) => (TOOL_PRIORITY[a.id] ?? 100) - (TOOL_PRIORITY[b.id] ?? 100),
    );

  for (const pack of packs) {
    sections.push(...pack.dockerfileLines);
  }

  return sections.join("\n") + "\n";
}
