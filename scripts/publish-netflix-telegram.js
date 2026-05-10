import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const args = parseArgs(process.argv.slice(2));
const globalImagePath = args.global || "outputs/netflix-top10-global.png";
const usImagePath = args.us || "outputs/netflix-top10-us.png";
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHANNEL;

if (!botToken || !chatId) {
  console.log("Skipped Telegram publish: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set.");
  process.exit(0);
}

const images = [];
if (existsSync(globalImagePath)) images.push({ key: "global", name: "netflix-top10-global.png", path: globalImagePath });
if (existsSync(usImagePath)) images.push({ key: "us", name: "netflix-top10-us.png", path: usImagePath });

if (images.length === 0) {
  throw new Error("No screenshot image was found to publish.");
}

const caption = buildCaption();
const form = new FormData();
form.append("chat_id", chatId);

if (images.length === 1) {
  const image = await readFile(images[0].path);
  form.append("photo", new Blob([image], { type: "image/png" }), images[0].name);
  form.append("caption", caption);
  await postTelegram("sendPhoto", form);
} else {
  const media = images.map((image, index) => ({
    type: "photo",
    media: `attach://${image.key}`,
    ...(index === 0 ? { caption } : {})
  }));
  form.append("media", JSON.stringify(media));
  for (const image of images) {
    const bytes = await readFile(image.path);
    form.append(image.key, new Blob([bytes], { type: "image/png" }), image.name);
  }
  await postTelegram("sendMediaGroup", form);
}

console.log("Published Netflix weekly ranking to Telegram.");

async function postTelegram(method, formData) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram publish failed (${response.status}): ${body}`);
  }
}

function buildCaption() {
  const pageUrl = process.env.PUBLIC_NETFLIX_PAGE_URL || process.env.PUBLIC_PAGE_URL || "https://zzcsama.github.io/github-black-tech-ranking/netflix-weekly-top10/";
  const lines = [
    "Netflix 剧集周榜前十 · 2026/4/27 - 2026/5/3",
    "全球榜与美国榜双图推送",
    "",
    "全球榜前三：",
    "1. 怒火边界：第 1 季 · 1100 万",
    "2. 我该嫁给杀人犯吗？：限定剧 · 1060 万",
    "3. 落选者：第 1 季 · 880 万",
    "",
    "美国榜前三：",
    "1. 我该嫁给杀人犯吗？：限定剧 · 1 周",
    "2. 怒火边界：第 1 季 · 1 周",
    "3. 运营核心：第 2 季 · 2 周",
    "",
    pageUrl
  ];

  const caption = lines.filter(Boolean).join("\n");
  return caption.length > 1000 ? `${caption.slice(0, 997)}...` : caption;
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
