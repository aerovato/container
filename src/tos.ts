import * as clack from "@clack/prompts";
import { SettingsStore } from "./config";

export const LATEST_TOS_VERSION = 3;

const TOS = `
\x1b[33mWarning: Security Advisory\x1b[0m

The main purpose of container is to protect commands like 'rm' or 'apt'
from unintentionally affecting your main system.

container does not protect from prompt injections in the event that an agent
becomes malaligned.

This is an innate problem within coding harness software and container does
not attempt to solve it.

Users are advised to not download or work with unverified software.
- Sensitive information inside the container may still be exfiltrated by
  an attacker just as with your regular system.
  - This includes:
  - OAuth credentials inside harness configs
  - API keys inside harness configs
  - SSH keys for git functionality if enabled

Never install or run your harness on unverified software. By using container,
you agree that you are aware of these risks and will not hold the author
liable for any outcomes arising from usage of the software.
`;

export async function ensureTosAccepted(
  settingsStore: SettingsStore,
): Promise<boolean> {
  const result = settingsStore.load();
  if (!result.ok) {
    return false;
  }

  if (result.value.tosVersion === LATEST_TOS_VERSION) {
    return true;
  }

  clack.note(TOS, "Terms of Service");

  const accepted = await clack.confirm({
    message: "Do you accept these terms?",
    initialValue: false,
  });

  if (clack.isCancel(accepted) || !accepted) {
    clack.cancel("Terms not accepted");
    return false;
  }

  const settings = result.value;
  settings.tosVersion = LATEST_TOS_VERSION;
  settingsStore.save(settings);
  return true;
}
