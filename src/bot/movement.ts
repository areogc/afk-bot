import { goals, type Movements } from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import type { Bot } from "mineflayer";
import type { AppConfig } from "../config";

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function isSolid(bot: Bot, position: Vec3): boolean {
  const block = bot.blockAt(position);
  return !!block && block.boundingBox === "block";
}

function isOpen(bot: Bot, position: Vec3): boolean {
  const block = bot.blockAt(position);
  return !block || block.boundingBox === "empty";
}

function findGroundY(bot: Bot, x: number, z: number, nearY: number): number | null {
  const top = Math.floor(nearY) + 4;
  const bottom = Math.floor(nearY) - 12;

  for (let y = top; y >= bottom; y--) {
    const feet = new Vec3(x, y, z);
    const head = new Vec3(x, y + 1, z);
    const ground = new Vec3(x, y - 1, z);

    if (isOpen(bot, feet) && isOpen(bot, head) && isSolid(bot, ground)) {
      return y;
    }
  }

  return null;
}

function pickWanderTarget(bot: Bot, radius: number): Vec3 | null {
  const origin = bot.entity.position;

  for (let attempt = 0; attempt < 12; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = randomBetween(radius * 0.3, radius);
    const x = Math.floor(origin.x + Math.cos(angle) * distance);
    const z = Math.floor(origin.z + Math.sin(angle) * distance);
    const y = findGroundY(bot, x, z, origin.y);

    if (y !== null) {
      return new Vec3(x + 0.5, y, z + 0.5);
    }
  }

  return null;
}

export function startWander(
  bot: Bot,
  movements: Movements,
  config: AppConfig["wander"],
): () => void {
  if (!config.enabled) return () => {};

  let active = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const scheduleNext = () => {
    if (!active) return;
    const delay = randomBetween(config.minIntervalMs, config.maxIntervalMs);
    timer = setTimeout(step, delay);
  };

  const step = () => {
    if (!active || !bot.entity) {
      scheduleNext();
      return;
    }

    const target = pickWanderTarget(bot, config.radius);
    if (!target) {
      scheduleNext();
      return;
    }

    bot.pathfinder.setMovements(movements);
    bot.pathfinder.setGoal(new goals.GoalNear(target.x, target.y, target.z, 1));
    scheduleNext();
  };

  scheduleNext();

  return () => {
    active = false;
    if (timer) clearTimeout(timer);
    try {
      bot.pathfinder.setGoal(null);
    } catch {
      /* bot already ended */
    }
  };
}

export function startAntiAfk(bot: Bot, config: AppConfig["antiAfk"]): () => void {
  const lookTimer = setInterval(() => {
    if (!bot.entity) return;
    const yaw = Math.random() * Math.PI * 2;
    const pitch = randomBetween(-0.4, 0.4);
    bot.look(yaw, pitch, true).catch(() => {});
  }, config.lookAroundIntervalMs);

  const jumpTimer = setInterval(() => {
    if (!bot.entity) return;
    bot.setControlState("jump", true);
    setTimeout(() => bot.setControlState("jump", false), 250);
  }, config.randomJumpIntervalMs);

  if (config.sneak) {
    bot.setControlState("sneak", true);
  }

  return () => {
    clearInterval(lookTimer);
    clearInterval(jumpTimer);
  };
}
