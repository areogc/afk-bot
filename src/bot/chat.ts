import type { Bot } from "mineflayer";
import type { AppConfig } from "../config";

export function registerChat(bot: Bot, config: AppConfig["chat"]): () => void {
  let repeatTimer: ReturnType<typeof setInterval> | null = null;

  if (config.repeat && config.messages.length > 0) {
    repeatTimer = setInterval(() => {
      const message =
        config.messages[Math.floor(Math.random() * config.messages.length)];
      if (message) bot.chat(message);
    }, config.repeatDelayMs);
  }

  const onChat = (username: string, message: string) => {
    if (!config.respond || username === bot.username) return;
    if (message.toLowerCase().includes(bot.username.toLowerCase())) {
      bot.chat(`Hey ${username}!`);
    }
  };

  bot.on("chat", onChat);

  return () => {
    if (repeatTimer) clearInterval(repeatTimer);
    bot.removeListener("chat", onChat);
  };
}
