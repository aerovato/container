import { z } from "zod";

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type BuildTarget = "full" | "tools" | "harness" | "user";

const RuntimeBinSchema = z.enum(["docker", "podman"]);
export type RuntimeBin = z.infer<typeof RuntimeBinSchema>;

export const DockerfileCoreConfigSchema = z.object({
  baseImage: z.string().optional(),
  workdir: z.string().optional(),
  cmd: z.string().optional(),
  promptCommand: z.string().optional(),
  disableDefaultCommands: z.boolean().optional(),
  customCommands: z.array(z.string()).optional(),
});
export type DockerfileCoreConfig = z.infer<typeof DockerfileCoreConfigSchema>;

export interface ConfigMount {
  host: string;
  config: string;
  mount: string;
}

export interface HarnessPack {
  id: string;
  name: string;
  detectCommand: string;
  dockerfileLines: string[];
  config: ConfigMount[];
}

export interface ToolPack {
  id: string;
  name: string;
  detectCommand: string;
  dockerfileLines: string[];
  config: ConfigMount[];
}

export const SystemMountsSchema = z.object({
  ssh: z.boolean().optional(),
});
export type SystemMounts = z.infer<typeof SystemMountsSchema>;

export const SettingsSchema = z.object({
  migrationVersion: z.number().optional(),
  onboardingVersion: z.number().optional(),
  tosVersion: z.number().optional(),
  dockerfileCore: DockerfileCoreConfigSchema.optional(),
  enabledHarnesses: z.array(z.string()).optional(),
  enabledTools: z.array(z.string()).optional(),
  runtime: RuntimeBinSchema.optional(),
  systemMounts: SystemMountsSchema.optional(),
  dockerRunFlags: z.array(z.string()).optional(),
  dockerExecFlags: z.array(z.string()).optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const StateSchema = z.object({
  buildDirty: z.enum(["tools", "harness"]).optional(),
  lastUpdateCheck: z.number().optional(),
});
export type StateData = z.infer<typeof StateSchema>;
