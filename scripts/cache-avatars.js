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

  const existing = findExistingAvatar(owner);
  if (existing && !args.refresh) {
    item.avatarLocal = existing.avatarLocal;
    console.log(`Reused ${owner} -> ${existing.avatarLocal}`);
    continue;
  }

  const urls = [
    `https://github.com/${owner}.png?size=160`,
    item.avatarUrl
  ].filter(Boolean);

  let cached = false;
  for (const url of urls) {
    cached = await cacheAvatar(owner, url, item);
    if (cached) break;
  }

  if (!cached) {
    console.warn(`Skipped ${owner}: avatar unavailable`);
  }
}

await writeFile(inputPath, `${JSON.stringify(ranking, null, 2)}\n`, "utf8");
console.log(`Updated ${inputPath}`);

function sanitize(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, "-");
}

function findExistingAvatar(owner) {
  const base = sanitize(owner);
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const avatarLocal = `assets/avatars/${base}.${ext}`;
    if (existsSync(resolve(avatarDir, `${base}.${ext}`))) return { avatarLocal };
  }
  return null;
}

async function cacheAvatar(owner, url, item) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "github-black-tech-ranking"
      }
    });
    if (!response.ok) return false;

    const data = Buffer.from(await response.arrayBuffer());
    const mime = sniffImageMime(data) || response.headers.get("content-type")?.split(";")[0]?.toLowerCase();
    const ext = extensionForMime(mime);
    if (!ext) return false;

    const filename = `${sanitize(owner)}.${ext}`;
    const avatarLocal = `assets/avatars/${filename}`;
    const outputPath = resolve(avatarDir, filename);
    await writeFile(outputPath, data);
    item.avatarLocal = avatarLocal;
    console.log(`Cached ${owner} -> ${avatarLocal}`);
    return true;
  } catch {
    return false;
  }
}

function sniffImageMime(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

function extensionForMime(mime) {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/webp") return "webp";
  return null;
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
