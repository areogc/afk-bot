import type { Bot } from "mineflayer";
import type { Entity } from "prismarine-entity";
import type { AppConfig } from "../config";

const HOSTILE_MOBS = new Set([
  "zombie",
  "husk",
  "drowned",
  "skeleton",
  "stray",
  "spider",
  "cave_spider",
  "creeper",
  "enderman",
  "witch",
  "slime",
  "phantom",
  "pillager",
  "vindicator",
  "evoker",
  "ravager",
  "guardian",
  "elder_guardian",
  "blaze",
  "ghast",
  "magma_cube",
  "silverfish",
  "vex",
  "hoglin",
  "zoglin",
  "piglin_brute",
  "warden",
  "shulker",
]);

const ATTACK_RANGE = 4.5;

function isHostile(entity: Entity): boolean {
  return entity.type === "mob" && !!entity.name && HOSTILE_MOBS.has(entity.name);
}

export function registerCombat(bot: Bot, config: AppConfig["combat"]): () => void {
  if (!config.attackMobs) return () => {};

  const timer = setInterval(() => {
    if (!bot.entity) return;

    const target = bot.nearestEntity(
      (entity) =>
        isHostile(entity) &&
        entity.position.distanceTo(bot.entity.position) <= ATTACK_RANGE,
    );

    if (target) {
      bot.lookAt(target.position.offset(0, target.height ?? 1, 0)).catch(() => {});
      bot.attack(target);
    }
  }, 500);

  return () => clearInterval(timer);
}
