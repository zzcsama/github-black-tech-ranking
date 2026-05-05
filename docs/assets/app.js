const rankingEl = document.querySelector("#ranking");
const template = document.querySelector("#repo-card-template");
const subtitleEl = document.querySelector("#subtitle");
const updatedEl = document.querySelector("#updatedLabel");
const countEl = document.querySelector("#countLabel");
const growthEl = document.querySelector("#growthLabel");

const response = await fetch("data/ranking.json", { cache: "no-store" });
const ranking = await response.json();
const items = ranking.items || [];

document.title = ranking.title || "开源黑科技榜单";
subtitleEl.textContent = ranking.subtitle || "GitHub 本周增长精选 · 翻译成你能听懂的大白话";
updatedEl.textContent = `${ranking.note || `精选 ${items.length} 个项目`} · 更新 ${ranking.updatedAt || ""}`;
countEl.textContent = ranking.note || `精选 ${items.length} 个项目`;
growthEl.textContent = `+${formatCompact(items.reduce((sum, item) => sum + Number(item.weeklyGrowth || 0), 0))}`;

rankingEl.replaceChildren(...items.map(renderCard));

function renderCard(item, index) {
  const card = template.content.firstElementChild.cloneNode(true);
  const owner = item.repo?.split("/")?.[0] || "github";
  const avatar = item.avatarLocal || item.avatarUrl || `https://github.com/${owner}.png?size=160`;

  card.href = item.url || `https://github.com/${item.repo}`;
  card.classList.toggle("is-hot", Boolean(item.hot || index < 2));
  card.querySelector(".rank").textContent = item.rank || index + 1;
  card.querySelector(".avatar").src = avatar;
  card.querySelector(".avatar").alt = `${owner} avatar`;
  card.querySelector(".repo").textContent = item.repo || "unknown/repo";
  card.querySelector(".summary").textContent = item.summaryZh || "这个项目还需要补一句中文解释";
  card.querySelector(".desc").textContent = item.summaryEn || item.description || "";
  card.querySelector(".stars").textContent = `★ ${formatCompact(item.stars || 0)}`;
  card.querySelector(".growth").textContent = `↗ +${formatCompact(item.weeklyGrowth || 0)}`;

  return card;
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
