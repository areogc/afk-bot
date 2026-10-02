export interface AppConfig {
  bot: {
    username: string;
    password?: string;
    authType: "offline" | "microsoft" | "mojang";
    host: string;
    port: number;
    version?: string;
  };
  autoAuth: {
    enabled: boolean;
    password?: string;
  };
  antiAfk: {
    sneak: boolean;
    lookAroundIntervalMs: number;
    randomJumpIntervalMs: number;
  };
  wander: {
    enabled: boolean;
    radius: number;
    minIntervalMs: number;
    maxIntervalMs: number;
  };
  combat: {
    attackMobs: boolean;
    autoEat: boolean;
  };
  chat: {
    respond: boolean;
    repeat: boolean;
    repeatDelayMs: number;
    messages: string[];
  };
  reconnect: {
    baseDelayMs: number;
    maxDelayMs: number;
    connectionTimeoutMs: number;
  };
  http: {
    port: number;
  };
  selfPing: {
    url?: string;
    intervalMs: number;
  };
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true" || value === "1";
}

function num(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function str(value: string | undefined, fallback = ""): string {
  return value && value.length > 0 ? value : fallback;
}

function list(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function loadConfig(): AppConfig {
  const env = process.env;

  return {
    bot: {
      username: str(env.BOT_USERNAME, "AFKBot"),
      password: env.BOT_PASSWORD || undefined,
      authType: (env.BOT_AUTH_TYPE as AppConfig["bot"]["authType"]) || "offline",
      host: str(env.SERVER_HOST, "localhost"),
      port: num(env.SERVER_PORT, 25565),
      version: env.SERVER_VERSION || undefined,
    },
    autoAuth: {
      enabled: bool(env.AUTO_AUTH_ENABLED, false),
      password: env.AUTO_AUTH_PASSWORD || undefined,
    },
    antiAfk: {
      sneak: bool(env.ANTI_AFK_SNEAK, true),
      lookAroundIntervalMs: num(env.LOOK_AROUND_INTERVAL_MS, 5000),
      randomJumpIntervalMs: num(env.RANDOM_JUMP_INTERVAL_MS, 10000),
    },
    wander: {
      enabled: bool(env.WANDER_ENABLED, true),
      radius: num(env.WANDER_RADIUS, 16),
      minIntervalMs: num(env.WANDER_MIN_INTERVAL_MS, 15000),
      maxIntervalMs: num(env.WANDER_MAX_INTERVAL_MS, 45000),
    },
    combat: {
      attackMobs: bool(env.ATTACK_MOBS, true),
      autoEat: bool(env.AUTO_EAT, true),
    },
    chat: {
      respond: bool(env.CHAT_RESPOND, true),
      repeat: bool(env.CHAT_REPEAT, true),
      repeatDelayMs: num(env.CHAT_REPEAT_DELAY_MS, 120000),
      messages: list(env.CHAT_MESSAGES),
    },
    reconnect: {
      baseDelayMs: num(env.RECONNECT_BASE_DELAY_MS, 2000),
      maxDelayMs: num(env.RECONNECT_MAX_DELAY_MS, 120000),
      connectionTimeoutMs: num(env.CONNECTION_TIMEOUT_MS, 150000),
    },
    http: {
      port: num(env.PORT, num(env.SERVER_PORT_HTTP, 5000)),
    },
    selfPing: {
      url: env.RENDER_EXTERNAL_URL || undefined,
      intervalMs: num(env.SELF_PING_INTERVAL_MS, 600000),
    },
  };
}
