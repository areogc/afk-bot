import { loadConfig } from "./config";
import { BotState } from "./bot/state";
import { BotManager } from "./bot/manager";
import { startServer } from "./server/api";
import { startSelfPing } from "./utils/selfPing";
import { addLog } from "./utils/logger";

const config = loadConfig();
const state = new BotState(config.bot.username, config.bot.host, config.bot.port);

startServer(config, state);
startSelfPing(config.selfPing);

const manager = new BotManager(config, state);
manager.start();

process.on("uncaughtException", (error) => {
  addLog(`uncaught exception: ${error.message}`);
});

process.on("unhandledRejection", (reason) => {
  addLog(`unhandled rejection: ${String(reason)}`);
});

process.on("SIGINT", () => {
  manager.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  manager.stop();
  process.exit(0);
});
