import type { Bot } from "mineflayer";
import type { AppConfig } from "../config";
import { addLog } from "../utils/logger";

export function registerAutoAuth(bot: Bot, config: AppConfig["autoAuth"]): void {
  if (!config.enabled || !config.password) return;

  let handled = false;

  bot.on("messagestr", (message) => {
    if (handled) return;
    const lower = message.toLowerCase();

    if (lower.includes("/register")) {
      bot.chat(`/register ${config.password} ${config.password}`);
      addLog("auto-auth: sent /register");
      handled = true;
      return;
    }

    if (lower.includes("/login")) {
      bot.chat(`/login ${config.password}`);
      addLog("auto-auth: sent /login");
      handled = true;
    }
  });
}
