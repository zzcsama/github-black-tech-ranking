import { readFile } from "node:fs/promises";

const args = parseArgs(process.argv.slice(2));
const rankingPath = args.input || "docs/data/ranking.json";
const ranking = JSON.parse(await readFile(rankingPath, "utf8"));

const webhookUrl = process.env.HERMES_WEBHOOK_URL;
if (!webhookUrl) {
  console.log("Skipped Hermes publish: HERMES_WEBHOOK_URL is not set.");
  process.exit(0);
}

const pageUrl = process.env.PUBLIC_PAGE_URL || "";
const imageUrl =
  process.env.PUBLIC_IMAGE_URL ||
  (pageUrl ? new URL("social/github-black-tech-ranking.png", ensureTrailingSlash(pageUrl)).toString() : "");
const channel = process.env.TELEGRAM_CHANNEL || "";
const items = (ranking.items || []).slice(0, Number(args.limit || 8));

const message = [
  `# ${ranking.title || "开源黑科技榜单"}`,
  ranking.subtitle || "GitHub 本周增长精选",
  `${ranking.note || `精选 ${items.length} 个项目`} · 更新 ${ranking.updatedAt || ""}`,
  "",
  ...items.map((item) => {
    const repoUrl = item.url || `https://github.com/${item.repo}`;
    return `${item.rank || ""}. ${item.repo} ★ ${formatCompact(item.stars)} ↗ +${formatCompact(
      item.weeklyGrowth,
    )}\n${item.summaryZh}\n${repoUrl}`;
  }),
  pageUrl ? `\n网页：${pageUrl}` : "",
  imageUrl ? `图片：${imageUrl}` : ""
]
  .filter(Boolean)
  .join("\n");

const payload = {
  channel,
  title: ranking.title || "开源黑科技榜单",
  text: message,
  message,
  parse_mode: "Markdown",
  image_url: imageUrl,
  imageUrl,
  page_url: pageUrl,
  pageUrl,
  ranking
};

const response = await fetch(webhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "github-black-tech-ranking"
  },
  body: JSON.stringify(payload)
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`Hermes publish failed (${response.status}): ${body}`);
}

console.log("Published ranking to Hermes.");

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

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
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
