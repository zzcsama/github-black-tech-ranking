import { readFile } from "node:fs/promises";

const args = parseArgs(process.argv.slice(2));
const rankingPath = args.input || "docs/data/ranking.json";
const imagePath = args.photo || "docs/social/github-black-tech-ranking.png";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHANNEL;

if (!botToken || !chatId) {
  console.log("Skipped Telegram publish: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set.");
  process.exit(0);
}

const ranking = JSON.parse(await readFile(rankingPath, "utf8"));
const image = await readFile(imagePath);
const caption = buildCaption(ranking);
const form = new FormData();

form.append("chat_id", chatId);
form.append("photo", new Blob([image], { type: "image/png" }), "github-black-tech-ranking.png");
form.append("caption", caption);

const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
  method: "POST",
  body: form
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`Telegram publish failed (${response.status}): ${body}`);
}

console.log("Published ranking to Telegram.");

function buildCaption(ranking) {
  const pageUrl = process.env.PUBLIC_PAGE_URL || "https://zzcsama.github.io/github-black-tech-ranking/";
  const items = (ranking.items || []).slice(0, 5);
  const lines = [
    `${ranking.title || "开源黑科技榜单"} · ${ranking.updatedAt || ""}`,
    ranking.subtitle || "GitHub 本周增长精选",
    "",
    ...items.map((item) => {
      const growth = item.growthPending ? "新上榜" : `↗ +${formatCompact(item.weeklyGrowth)}`;
      return `${item.rank || ""}. ${item.repo} ★ ${formatCompact(item.stars)} ${growth}\n${item.summaryZh || ""}`;
    }),
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

function formatCompact(value) {
  const number = Number(value) || 0;
  if (number >= 1_000_000) return `${trim(number / 1_000_000)}m`;
  if (number >= 1_000) return `${trim(number / 1_000)}k`;
  return String(Math.round(number));
}

function trim(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
