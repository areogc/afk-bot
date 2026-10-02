import type { AppConfig } from "../config";

export function computeReconnectDelay(
  config: AppConfig["reconnect"],
  attempt: number,
): number {
  const exponential = config.baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, config.maxDelayMs);
  const jitter = Math.floor(Math.random() * 1000);
  return capped + jitter;
}
