import { StateStore } from "./config";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const REGISTRY_URL = "https://registry.npmjs.org/@aerovato/container/latest";

export async function maybeCheckForUpdate(
  stateStore: StateStore,
  currentVersion: string,
): Promise<{ current: string; latest: string } | null> {
  const stateResult = stateStore.load();
  if (!stateResult.ok) {
    return null;
  }
  const state = stateResult.value;
  const now = Date.now();
  if (
    state.lastUpdateCheck !== undefined
    && now - state.lastUpdateCheck < ONE_DAY_MS
  ) {
    return null;
  }

  const latest = await fetchLatestVersion().catch(() => null);

  const updatedState = { ...state, lastUpdateCheck: now };
  stateStore.save(updatedState);

  if (latest === null || latest === currentVersion) {
    return null;
  }
  if (isNewerVersion(latest, currentVersion)) {
    return { current: currentVersion, latest: latest };
  }
  return null;
}

function fetchLatestVersion(): Promise<string> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("timeout")), 2000);
  });
  const fetchP = fetch(REGISTRY_URL)
    .then(res => {
      if (!res.ok) throw new Error("bad status");
      return res.json();
    })
    .then((json: unknown) => {
      const version = (json as { version?: unknown })?.version;
      if (typeof version === "string") return version;
      throw new Error("no version");
    });
  return Promise.race([fetchP, timeout]);
}

function isNewerVersion(latest: string, current: string): boolean {
  const lParts = latest.split(".").map(p => parseInt(p, 10) || 0);
  const cParts = current.split(".").map(p => parseInt(p, 10) || 0);
  const maxLen = Math.max(lParts.length, cParts.length);
  for (let i = 0; i < maxLen; i++) {
    const l = lParts[i] || 0;
    const c = cParts[i] || 0;
    if (l > c) {
      return true;
    }
    if (l < c) {
      return false;
    }
  }
  return false;
}
