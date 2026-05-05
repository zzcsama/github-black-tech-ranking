import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(args.input || "data/ranking.sample.json");
const outputPath = resolve(args.output || "outputs/github-black-tech-ranking.svg");
const assetRoot = resolve(args["asset-root"] || args.assetRoot || ".");

const raw = await readFile(inputPath, "utf8");
const ranking = JSON.parse(raw);
await hydrateAvatarData(ranking, assetRoot);
const svg = renderRanking(ranking);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, svg, "utf8");

console.log(`Generated ${outputPath}`);

function renderRanking(data) {
  const width = 1080;
  const height = 1440;
  const cardX = 64;
  const cardW = 952;
  const cardH = 124;
  const gap = 22;
  const startY = 282;
  const items = (data.items || []).slice(0, 8);

  const cards = items
    .map((item, index) => {
      const y = startY + index * (cardH + gap);
      return renderCard(item, index, cardX, y, cardW, cardH);
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.10"/>
    </filter>
    <filter id="softShadow" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#64748b" flood-opacity="0.12"/>
    </filter>
    <pattern id="dotGrid" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="#dbe4ee" opacity="0.55"/>
    </pattern>
    <linearGradient id="bgWash" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f1f7fb"/>
    </linearGradient>
    <style>
      .font { font-family: "Noto Sans CJK SC", "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, Arial, sans-serif; }
      .mono { font-family: "SFMono-Regular", "Cascadia Mono", "Roboto Mono", "Noto Sans Mono CJK SC", Menlo, Consolas, monospace; }
      .title { font-size: 44px; font-weight: 850; fill: #111827; letter-spacing: 0; }
      .subtitle { font-size: 29px; font-weight: 650; fill: #667385; letter-spacing: 0; }
      .meta { font-size: 19px; font-weight: 620; fill: #718096; letter-spacing: 0; }
      .repo { font-size: 27px; font-weight: 850; fill: #101827; letter-spacing: 0; }
      .summary { font-size: 24px; font-weight: 780; fill: #111827; letter-spacing: 0; }
      .desc { font-size: 18px; font-weight: 520; fill: #666f7d; letter-spacing: 0; }
      .stat { font-size: 20px; font-weight: 680; fill: #627084; letter-spacing: 0; }
      .growth { font-size: 20px; font-weight: 830; fill: #19a463; letter-spacing: 0; }
    </style>
  </defs>

  <rect width="1080" height="1440" fill="url(#bgWash)"/>
  <rect width="1080" height="1440" fill="url(#dotGrid)" opacity="0.55"/>

  <g class="font">
    <g transform="translate(64 48)" filter="url(#softShadow)">
      <rect width="168" height="50" rx="25" fill="#eef7ff" stroke="#d7eafe"/>
      <text x="84" y="32" text-anchor="middle" font-size="23" font-weight="820" fill="#2076d8">${escapeXml(
        data.tag || "开源黑科技",
      )}</text>
    </g>

    <g transform="translate(64 130)">
      ${renderGithubMark(1, 4)}
      <text class="title" x="56" y="34">${escapeXml(data.title || "开源黑科技榜单")}</text>
    </g>

    <text class="subtitle" x="64" y="216">${escapeXml(
      data.subtitle || "GitHub 本周增长精选 · 翻译成你能听懂的大白话",
    )}</text>
    <text class="meta" x="64" y="252">${escapeXml(data.note || `精选 ${items.length} 个项目`)}  更新 ${escapeXml(
      data.updatedAt || formatDate(new Date()),
    )}</text>
  </g>

  ${cards}
</svg>`;
}

function renderCard(item, index, x, y, w, h) {
  const rank = item.rank || index + 1;
  const rankDark = rank <= 2;
  const accent = item.accent || colorFromString(item.repo || String(rank));
  const initials = initialsFromRepo(item.repo || "");
  const summaryZh = truncateEnd(item.summaryZh || "这个项目还需要补一句中文解释", 30);
  const summaryEn = truncateEnd(item.summaryEn || item.description || "", 76);
  const stars = formatCompact(item.stars || 0);
  const growth = `+${formatCompact(item.weeklyGrowth || 0)}`;
  const hot = item.hot || rank <= 2;
  const repo = truncateMiddle(item.repo || "unknown/repo", hot ? 24 : 30);
  const statX = w - 168;
  const growthX = w - 28;
  const avatar = item.avatarDataUri
    ? `<image href="${item.avatarDataUri}" x="102" y="23" width="58" height="58" clip-path="url(#avatarClip${rank})" preserveAspectRatio="xMidYMid slice"/>`
    : `<g transform="translate(102 23)">
      <circle cx="29" cy="29" r="28" fill="${accent}" opacity="0.96"/>
      <circle cx="29" cy="29" r="22" fill="#ffffff" opacity="0.13"/>
      <text x="29" y="37" text-anchor="middle" font-size="22" font-weight="850" fill="#ffffff">${escapeXml(initials)}</text>
    </g>`;

  return `<g class="font" transform="translate(${x} ${y})" filter="url(#shadow)">
    <defs>
      <clipPath id="avatarClip${rank}">
        <circle cx="131" cy="52" r="29"/>
      </clipPath>
    </defs>
    <rect width="${w}" height="${h}" rx="28" fill="#ffffff"/>
    <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="27" fill="none" stroke="#edf2f7"/>

    <rect x="24" y="21" width="58" height="58" rx="16" fill="${rankDark ? "#111827" : "#f1f5f9"}"/>
    <text x="53" y="59" text-anchor="middle" font-size="31" font-weight="850" fill="${
      rankDark ? "#ffffff" : "#67758a"
    }">${rank}</text>

    <circle cx="131" cy="52" r="29" fill="#e9eef5" stroke="#d8e2ed"/>
    ${avatar}

    <text class="repo mono" x="176" y="45">${escapeXml(repo)}</text>
    <text class="summary" x="176" y="83">${escapeXml(summaryZh)}</text>
    <text class="desc" x="176" y="111">${escapeXml(summaryEn)}</text>

    ${
      hot
        ? `<g transform="translate(${w - 360} 25)">
      <rect width="78" height="34" rx="17" fill="#fff4cf"/>
      <text x="39" y="23" text-anchor="middle" font-size="18" font-weight="820" fill="#da8a0a">热门</text>
    </g>`
        : ""
    }

    <text class="stat" x="${statX}" y="44" text-anchor="end">★ ${stars}</text>
    <text class="growth" x="${growthX}" y="44" text-anchor="end">↗ ${growth}</text>
  </g>`;
}

async function hydrateAvatarData(data, root) {
  const items = data.items || [];
  for (const item of items) {
    if (!item.avatarLocal) continue;
    const avatarPath = resolve(root, item.avatarLocal);
    if (!existsSync(avatarPath)) continue;
    const buffer = await readFile(avatarPath);
    item.avatarDataUri = `data:${mimeType(avatarPath)};base64,${buffer.toString("base64")}`;
  }
}

function mimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "image/png";
}

function renderGithubMark(x, y) {
  return `<g transform="translate(${x} ${y})">
    <circle cx="24" cy="24" r="18" fill="#111827"/>
    <circle cx="17" cy="17" r="4" fill="#ffffff"/>
    <circle cx="31" cy="17" r="4" fill="#ffffff"/>
    <path d="M13 26c4 11 18 11 22 0 1-5-1-10-5-12 0 0-2 3-6 3s-6-3-6-3c-4 2-6 7-5 12z" fill="#ffffff"/>
    <rect x="20" y="35" width="8" height="9" rx="3" fill="#111827"/>
  </g>`;
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

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatCompact(value) {
  const number = Number(value) || 0;
  if (number >= 1_000_000) return `${trimNumber(number / 1_000_000)}m`;
  if (number >= 1_000) return `${trimNumber(number / 1_000)}k`;
  return String(Math.round(number));
}

function trimNumber(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function truncateEnd(text, max) {
  const value = String(text || "");
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function truncateMiddle(text, max) {
  const value = String(text || "");
  if (value.length <= max) return value;
  const keepStart = Math.ceil((max - 1) * 0.62);
  const keepEnd = max - 1 - keepStart;
  return `${value.slice(0, keepStart)}…${value.slice(-keepEnd)}`;
}

function initialsFromRepo(repo) {
  const [, name = repo] = repo.split("/");
  const parts = name.split(/[-_\s.]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return letters || "GH";
}

function colorFromString(text) {
  const palette = ["#2d6cdf", "#d9487d", "#13a085", "#f0a62b", "#7c5cff", "#334155", "#e85d3f", "#0f9f8f"];
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

function formatDate(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
