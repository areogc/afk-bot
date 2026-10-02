import mineflayer, { type Bot } from "mineflayer";
import { Movements, pathfinder } from "mineflayer-pathfinder";
import type { AppConfig } from "../config";
import type { BotState } from "./state";
import { addLog } from "../utils/logger";
import { startAntiAfk, startWander } from "./movement";
import { registerAutoAuth } from "./autoAuth";
import { registerCombat } from "./combat";
import { registerAutoEat } from "./autoEat";
import { registerChat } from "./chat";
import { computeReconnectDelay } from "./reconnect";

export class BotManager {
  private bot: Bot | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private cleanupModules: Array<() => void> = [];
  private stopped = false;

  constructor(
    private readonly config: AppConfig,
    private readonly state: BotState,
  ) {}

  start(): void {
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.teardown();
  }

  private connect(): void {
    if (this.stopped) return;

    this.teardown();
    addLog(`connecting to ${this.config.bot.host}:${this.config.bot.port}`);

    const bot = mineflayer.createBot({
      username: this.config.bot.username,
      password: this.config.bot.password,
      auth: this.config.bot.authType,
      host: this.config.bot.host,
      port: this.config.bot.port,
      version: this.config.bot.version || undefined,
      hideErrors: false,
      checkTimeoutInterval: 600000,
    });

    this.bot = bot;
    bot.loadPlugin(pathfinder);

    this.connectionTimer = setTimeout(() => {
      if (!this.state.get().connected) {
        addLog("connection timed out before spawn");
        this.teardown();
        this.scheduleReconnect();
      }
    }, this.config.reconnect.connectionTimeoutMs);

    let spawned = false;

    bot.once("spawn", () => {
      if (spawned) return;
      spawned = true;

      if (this.connectionTimer) clearTimeout(this.connectionTimer);
      this.reconnectAttempts = 0;
      this.state.update({ connected: true, lastActivity: Date.now() });
      addLog("spawned and connected");

      const movements = new Movements(bot);

      this.cleanupModules = [
        startWander(bot, movements, this.config.wander),
        startAntiAfk(bot, this.config.antiAfk),
        registerCombat(bot, this.config.combat),
        registerAutoEat(bot, this.config.combat),
        registerChat(bot, this.config.chat),
      ];

      registerAutoAuth(bot, this.config.autoAuth);
    });

    bot.on("end", (reason) => {
      addLog(`disconnected: ${reason}`);
      this.state.update({ connected: false });
      this.runCleanupModules();
      this.scheduleReconnect();
    });

    bot.on("kicked", (reason) => {
      addLog(`kicked: ${String(reason)}`);
    });

    bot.on("error", (error) => {
      addLog(`bot error: ${error.message}`);
    });

    bot.on("physicsTick", () => {
      this.state.update({ lastActivity: Date.now() });
    });
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;

    this.reconnectAttempts += 1;
    this.state.update({ reconnectAttempts: this.reconnectAttempts });

    const delay = computeReconnectDelay(this.config.reconnect, this.reconnectAttempts);
    addLog(`reconnecting in ${Math.round(delay / 1000)}s`);

    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private runCleanupModules(): void {
    for (const cleanup of this.cleanupModules) {
      try {
        cleanup();
      } catch {
        /* module already torn down */
      }
    }
    this.cleanupModules = [];
  }

  private teardown(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.runCleanupModules();

    if (this.bot) {
      try {
        this.bot.removeAllListeners();
        this.bot.end();
      } catch {
        /* already ended */
      }
      this.bot = null;
    }
  }
}
