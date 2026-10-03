// Patches an installed `minecraft-data` package with support for
// Minecraft 26.3, which was released (2026-09-15) after the last npm
// release of minecraft-data that this project's dependencies resolve to.
//
// Upstream tracking: https://github.com/PrismarineJS/minecraft-data/issues/1299
// Source data vendored from: https://github.com/PrismarineJS/minecraft-data
//   (commit e4cbec4b17815d6ce8d8ba991dd3b2d9d8f4a57d, branch pc_26_3)
//
// Remove this script and the `vendor/minecraft-data-26.3` folder once a
// published `minecraft-data` release natively supports "26.3".
//
// Runs as a postinstall step so it works regardless of how many nested
// copies of minecraft-data end up in node_modules (mineflayer,
// minecraft-protocol, prismarine-entity, etc. each depend on it).

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const vendorDir = join(projectRoot, "vendor", "minecraft-data-26.3");
const nodeModulesRoot = join(projectRoot, "node_modules");

const PROTOCOL_VERSION_ENTRY_26_3 = {
  minecraftVersion: "26.3",
  version: 777,
  dataVersion: 5023,
  usesNetty: true,
  majorVersion: "26.3",
  releaseType: "release",
};

const DATA_PATHS_26_3 = {
  attributes: "pc/26.1",
  blockCollisionShapes: "pc/26.1",
  blocks: "pc/26.1",
  blockLoot: "pc/1.20",
  biomes: "pc/26.1",
  commands: "pc/1.20.3",
  effects: "pc/26.1",
  enchantments: "pc/26.1",
  entities: "pc/26.1",
  entityLoot: "pc/1.20",
  foods: "pc/26.1",
  instruments: "pc/26.1",
  items: "pc/26.1",
  language: "pc/26.1",
  loginPacket: "pc/26.1",
  mapIcons: "pc/1.20.2",
  materials: "pc/26.1",
  particles: "pc/26.1",
  protocol: "pc/26.3",
  recipes: "pc/26.1",
  sounds: "pc/26.1",
  tints: "pc/26.1",
  version: "pc/26.3",
  windows: "pc/1.16.1",
  proto: "pc/latest",
};

// Generic: walk every node_modules directory in the tree (following
// nested node_modules of each dependency), calling `onPackageDir(name, dir)`
// for every immediate package folder found.
function walkPackages(root, onPackageDir) {
  function walk(nmDir) {
    let entries;
    try {
      entries = readdirSync(nmDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === ".bin") continue;
      if (entry.name.startsWith("@")) {
        // scoped packages: one more level down
        let scoped;
        try {
          scoped = readdirSync(join(nmDir, entry.name), { withFileTypes: true });
        } catch {
          continue;
        }
        for (const sub of scoped) {
          if (!sub.isDirectory()) continue;
          onPackageDir(`${entry.name}/${sub.name}`, join(nmDir, entry.name, sub.name));
          const nested = join(nmDir, entry.name, sub.name, "node_modules");
          if (existsSync(nested)) walk(nested);
        }
        continue;
      }
      onPackageDir(entry.name, join(nmDir, entry.name));
      const nested = join(nmDir, entry.name, "node_modules");
      if (existsSync(nested)) walk(nested);
    }
  }
  walk(root);
}

function findMinecraftDataDirs(root) {
  const found = [];
  walkPackages(root, (name, pkgDir) => {
    if (name !== "minecraft-data") return;
    // The npm package wraps the minecraft-data git repo in a nested
    // folder of the same name: <pkgDir>/minecraft-data/data/...
    const mdDir = join(pkgDir, "minecraft-data");
    if (existsSync(join(pkgDir, "package.json")) && existsSync(join(mdDir, "data"))) {
      found.push({ pkgDir, mdDir });
    }
  });
  return found;
}

function findMineflayerVersionFiles(root) {
  const found = [];
  walkPackages(root, (name, pkgDir) => {
    if (name !== "mineflayer") return;
    const versionFile = join(pkgDir, "lib", "version.js");
    if (existsSync(versionFile)) found.push(versionFile);
  });
  return found;
}

if (!existsSync(nodeModulesRoot)) {
  console.warn("[patch-minecraft-data] no node_modules found; skipping");
  process.exit(0);
}

const targets = findMinecraftDataDirs(nodeModulesRoot);

if (targets.length === 0) {
  console.warn("[patch-minecraft-data] no installed minecraft-data copies found; skipping");
  process.exit(0);
}

const protocolSrc = readFileSync(join(vendorDir, "protocol.json"));
const versionSrc = readFileSync(join(vendorDir, "version.json"));

for (const { pkgDir, mdDir: dir } of targets) {
  const versionDir = join(dir, "data", "pc", "26.3");
  mkdirSync(versionDir, { recursive: true });
  writeFileSync(join(versionDir, "protocol.json"), protocolSrc);
  writeFileSync(join(versionDir, "version.json"), versionSrc);

  const versionsPath = join(dir, "data", "pc", "common", "versions.json");
  const versions = JSON.parse(readFileSync(versionsPath, "utf8"));
  if (!versions.includes("26.3")) {
    versions.push("26.3");
    writeFileSync(versionsPath, JSON.stringify(versions, null, 2) + "\n");
  }

  const dataPathsPath = join(dir, "data", "dataPaths.json");
  const dataPaths = JSON.parse(readFileSync(dataPathsPath, "utf8"));
  dataPaths.pc = dataPaths.pc || {};
  dataPaths.pc["26.3"] = DATA_PATHS_26_3;
  writeFileSync(dataPathsPath, JSON.stringify(dataPaths, null, 2) + "\n");

  const protocolVersionsPath = join(dir, "data", "pc", "common", "protocolVersions.json");
  const protocolVersions = JSON.parse(readFileSync(protocolVersionsPath, "utf8"));
  if (!protocolVersions.some((entry) => entry.minecraftVersion === "26.3")) {
    protocolVersions.unshift(PROTOCOL_VERSION_ENTRY_26_3);
    writeFileSync(protocolVersionsPath, JSON.stringify(protocolVersions, null, 2) + "\n");
  }

  // data.js is a generated require-map built from dataPaths.json at
  // publish time; regenerate it so the new "26.3" entry is actually
  // reachable at runtime (index.js does `data[type][majorVersion]`
  // against this generated file, not against dataPaths.json directly).
  const generatorPath = join(pkgDir, "bin", "generate_data.js");
  if (existsSync(generatorPath)) {
    execFileSync(process.execPath, [generatorPath], { cwd: pkgDir, stdio: "inherit" });
  } else {
    console.warn(`[patch-minecraft-data] generate_data.js not found in ${pkgDir}; data.js was not regenerated`);
  }

  console.log(`[patch-minecraft-data] added Minecraft 26.3 support to ${pkgDir}`);
}

// mineflayer also keeps its own hardcoded allowlist of "tested" versions
// (lib/version.js) independent of minecraft-data, and refuses to connect
// to anything newer than the last entry. Add "26.3" to that list too.
const mineflayerVersionFiles = findMineflayerVersionFiles(nodeModulesRoot);
for (const file of mineflayerVersionFiles) {
  const src = readFileSync(file, "utf8");
  if (src.includes("'26.3'")) continue;
  const patched = src.replace(
    /(const testedVersions = \[[^\]]*)\]/,
    (match, prefix) => `${prefix}, '26.3']`
  );
  if (patched === src) {
    console.warn(`[patch-minecraft-data] could not find testedVersions array in ${file}; skipping`);
    continue;
  }
  writeFileSync(file, patched);
  console.log(`[patch-minecraft-data] added "26.3" to mineflayer's testedVersions in ${file}`);
}
