import type { AppConfig } from "../config";
import { addLog } from "./logger";

export function startSelfPing(config: AppConfig["selfPing"]): void {
  if (!config.url) return;

  const target = `${config.url.replace(/\/$/, "")}/ping`;

  setInterval(() => {
    fetch(target).catch((error: unknown) => {
      addLog(`self-ping failed: ${String(error)}`);
    });
  }, config.intervalMs);

  addLog(`self-ping enabled for ${target}`);
}
