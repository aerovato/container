import { z } from "zod";

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type BuildTarget = "full" | "harness" | "user";

export const DockerfileCoreConfigSchema = z.object({
  baseImage: z.string().optional(),
  workdir: z.string().optional(),
  cmd: z.string().optional(),
  promptCommand: z.string().optional(),
  disableDefaultCommands: z.boolean().optional(),
  customCommands: z.array(z.string()).optional(),
});
export type DockerfileCoreConfig = z.infer<typeof DockerfileCoreConfigSchema>;

export interface HarnessConfig {
  host: string;
  config: string;
  mount: string;
}

export interface HarnessPack {
  id: string;
  name: string;
  detectCommand: string;
  dockerfileLines: string[];
  config: HarnessConfig[];
}

export const SystemMountsSchema = z.object({
  gitconfig: z.boolean().optional(),
  ssh: z.boolean().optional(),
});
export type SystemMounts = z.infer<typeof SystemMountsSchema>;

export const SettingsSchema = z.object({
  migrationVersion: z.number().optional(),
  onboardingVersion: z.number().optional(),
  tosVersion: z.number().optional(),
  dockerfileCore: DockerfileCoreConfigSchema.optional(),
  enabledHarnesses: z.array(z.string()).optional(),
  runtime: z.enum(["docker", "podman"]).optional(),
  systemMounts: SystemMountsSchema.optional(),
  dockerRunFlags: z.array(z.string()).optional(),
  dockerExecFlags: z.array(z.string()).optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const StateSchema = z.object({
  buildDirty: z.enum(["core", "harness"]).optional(),
  lastUpdateCheck: z.number().optional(),
});
export type StateData = z.infer<typeof StateSchema>;
