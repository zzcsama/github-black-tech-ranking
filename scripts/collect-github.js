import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));
const outputPath = resolve(args.output || "data/ranking.generated.json");
const snapshotDir = resolve(args.snapshots || "data/snapshots");
const limit = Number(args.limit || 8);
const date = args.date || formatDateForFile(new Date());

const queries = [
  "topic:ai stars:>1000 archived:false fork:false",
  "topic:llm stars:>500 archived:false fork:false",
  "topic:agents stars:>500 archived:false fork:false",
  "AI in:name,description stars:>1000 archived:false fork:false",
  "Claude in:name,description stars:>500 archived:false fork:false",
  "Codex in:name,description stars:>100 archived:false fork:false"
];

const repos = await collectRepositories(queries);
await mkdir(snapshotDir, { recursive: true });

const snapshot = Object.fromEntries(
  repos.map((repo) => [
    repo.full_name,
    {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      pushedAt: repo.pushed_at,
      description: repo.description,
      topics: repo.topics || [],
      language: repo.language,
      htmlUrl: repo.html_url,
      ownerAvatarUrl: repo.owner?.avatar_url
    }
  ])
);

const snapshotPath = join(snapshotDir, `${date}.json`);
await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

const baseline = await loadBestBaseline(snapshotDir, date);
const rankingItems = repos
  .map((repo) => {
    const baselineStars = baseline?.[repo.full_name]?.stars;
    const growthPending = !Number.isFinite(baselineStars);
    const weeklyGrowth = growthPending ? 0 : repo.stargazers_count - baselineStars;
    return {
      repo: repo.full_name,
      summaryZh: summarizeZh(repo),
      summaryEn: repo.description || "No description provided.",
      stars: repo.stargazers_count,
      weeklyGrowth: Math.max(weeklyGrowth, 0),
      growthPending,
      hot: weeklyGrowth > 5000,
      accent: colorFromString(repo.full_name),
      url: repo.html_url,
      avatarUrl: repo.owner?.avatar_url,
      language: repo.language,
      topics: repo.topics || []
    };
  })
  .sort((a, b) => rankingScore(b) - rankingScore(a))
  .slice(0, limit)
  .map((item, index) => ({ rank: index + 1, ...item }));

const output = {
  title: "开源黑科技榜单",
  subtitle: "GitHub 本周增长精选 · 翻译成你能听懂的大白话",
  tag: "开源黑科技",
  note: `精选 ${rankingItems.length} 个 AI 相关项目`,
  updatedAt: formatDateForDisplay(new Date(`${date}T00:00:00`)),
  items: rankingItems
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(`Saved snapshot ${snapshotPath}`);
console.log(`Saved ranking ${outputPath}`);

async function collectRepositories(searchQueries) {
  const merged = new Map();
  for (const query of searchQueries) {
    const results = await searchRepositories(query);
    for (const repo of results) {
      if (!repo.archived && !repo.fork) merged.set(repo.full_name, repo);
    }
  }
  return [...merged.values()];
}

async function searchRepositories(query) {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", "50");

  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "github-black-tech-ranking"
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub search failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.items || [];
}

async function loadBestBaseline(dir, currentDate) {
  if (!existsSync(dir)) return null;
  const files = (await readdir(dir)).filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file)).sort();
  const targetTime = new Date(`${currentDate}T00:00:00`).getTime() - 7 * 24 * 60 * 60 * 1000;
  const targetDate = formatDateForFile(new Date(targetTime));
  const exact = files.find((file) => file === `${targetDate}.json`);
  const candidate = exact || files.filter((file) => file < `${currentDate}.json`).at(-1);
  if (!candidate) return null;

  const raw = await readFile(join(dir, candidate), "utf8");
  return JSON.parse(raw);
}

function rankingScore(item) {
  const growthScore = item.growthPending ? 0 : item.weeklyGrowth * 10;
  return growthScore + item.stars * 0.05;
}

function summarizeZh(repo) {
  const text = `${repo.full_name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
  if (text.includes("trading") || text.includes("finance")) return "用AI辅助金融分析、交易研究或投资决策";
  if (text.includes("agent")) return "搭建智能体工作流，把复杂任务拆给多个AI处理";
  if (text.includes("video")) return "用AI生成或处理视频内容，减少手动剪辑成本";
  if (text.includes("code") || text.includes("codex") || text.includes("claude")) return "提升AI写代码和理解代码库的效率";
  if (text.includes("rag") || text.includes("search")) return "把资料检索和问答流程做得更自动化";
  if (text.includes("image") || text.includes("diffusion")) return "用AI生成、编辑或理解图片内容";
  if (text.includes("llm")) return "围绕大模型开发、部署或增强应用能力";
  return "一个近期增长很快的AI相关开源项目";
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

function formatDateForFile(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateForDisplay(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function colorFromString(text) {
  const palette = ["#2d6cdf", "#d9487d", "#13a085", "#f0a62b", "#7c5cff", "#334155", "#e85d3f", "#0f9f8f"];
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}
