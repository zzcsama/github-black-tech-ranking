import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(args.input || "docs/data/ranking.json");
const avatarDir = resolve(args.avatarDir || "docs/assets/avatars");

const ranking = JSON.parse(await readFile(inputPath, "utf8"));
await mkdir(avatarDir, { recursive: true });

for (const item of ranking.items || []) {
  const [owner] = String(item.repo || "").split("/");
  if (!owner) continue;

  const filename = `${sanitize(owner)}.png`;
  const avatarLocal = `assets/avatars/${filename}`;
  const url = item.avatarUrl || `https://github.com/${owner}.png?size=160`;
  const outputPath = resolve(avatarDir, filename);

  if (existsSync(outputPath) && !args.refresh) {
    item.avatarLocal = avatarLocal;
    console.log(`Reused ${owner} -> ${avatarLocal}`);
    continue;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "github-black-tech-ranking"
      }
    });
    if (!response.ok) {
      console.warn(`Skipped ${owner}: ${response.status}`);
      continue;
    }

    const data = Buffer.from(await response.arrayBuffer());
    await writeFile(outputPath, data);
    item.avatarLocal = avatarLocal;
    console.log(`Cached ${owner} -> ${avatarLocal}`);
  } catch (error) {
    if (existsSync(outputPath)) {
      item.avatarLocal = avatarLocal;
      console.log(`Reused ${owner} -> ${avatarLocal}`);
      continue;
    }

    console.warn(`Skipped ${owner}: ${error.message}`);
  }
}

await writeFile(inputPath, `${JSON.stringify(ranking, null, 2)}\n`, "utf8");
console.log(`Updated ${inputPath}`);

function sanitize(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, "-");
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      result[arg.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return result;
}
