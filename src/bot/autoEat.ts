import type { Bot } from "mineflayer";
import type { AppConfig } from "../config";
import { addLog } from "../utils/logger";

const FOOD_NAMES = new Set([
  "bread",
  "apple",
  "baked_potato",
  "cooked_beef",
  "cooked_porkchop",
  "cooked_mutton",
  "cooked_chicken",
  "cooked_rabbit",
  "cooked_cod",
  "cooked_salmon",
  "carrot",
  "potato",
  "beetroot",
  "melon_slice",
  "sweet_berries",
  "pumpkin_pie",
  "cookie",
  "golden_apple",
  "golden_carrot",
]);

const EAT_THRESHOLD = 18;

export function registerAutoEat(bot: Bot, config: AppConfig["combat"]): () => void {
  if (!config.autoEat) return () => {};

  let eating = false;

  const tryEat = async () => {
    if (eating || !bot.entity || bot.food >= EAT_THRESHOLD) return;

    const food = bot.inventory
      .items()
      .find((item) => FOOD_NAMES.has(item.name));

    if (!food) return;

    eating = true;
    try {
      await bot.equip(food, "hand");
      await bot.consume();
    } catch (error) {
      addLog(`auto-eat failed: ${String(error)}`);
    } finally {
      eating = false;
    }
  };

  bot.on("health", tryEat);
  const timer = setInterval(tryEat, 5000);

  return () => {
    bot.removeListener("health", tryEat);
    clearInterval(timer);
  };
}
