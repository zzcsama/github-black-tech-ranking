# GitHub 开源黑科技榜单

一个可以放到 GitHub 的开源项目：既有可点击的榜单网页，也能生成公众号 / X / 小红书 / GitHub README 可用的榜单图片。

![开源黑科技榜单](https://zzcsama.github.io/github-black-tech-ranking/social/github-black-tech-ranking.png)

## 先看效果

本机需要有 Node.js。导出 PNG 需要 `rsvg-convert`，macOS 可以用：

```bash
brew install librsvg
```

```bash
npm run build
npm run dev
```

打开本地页面：

```text
http://localhost:4173
```

生成的社媒图片：

```text
outputs/github-black-tech-ranking.png
docs/social/github-black-tech-ranking.png
```

## 页面和图片分别在哪里

```text
docs/index.html                  GitHub Pages 网页入口
docs/data/ranking.json           网页使用的榜单数据
docs/assets/avatars/*.png        缓存下来的 GitHub 头像
docs/social/github-black-tech-ranking.png
outputs/github-black-tech-ranking.png
outputs/github-black-tech-ranking.svg
```

网页里的每一张项目卡片都可以点击，直接跳转到对应 GitHub 仓库。

## 接真实 GitHub 数据

```bash
GITHUB_TOKEN=你的token npm run build:generated
```

第一次运行只能拿到当前 Star 数。连续每天运行，满 7 天后，就能稳定计算出“本周新增 Star”。

## 放到 GitHub

1. 新建一个 GitHub 仓库。
2. 把这个目录里的文件提交并推送到仓库。
3. 在仓库 Settings -> Pages 里选择 GitHub Actions。
4. 推送到 `main` 后，`.github/workflows/pages.yml` 会自动部署 `docs/` 页面。
5. `.github/workflows/weekly-ranking.yml` 会每周日更新数据、头像和图片。

README 里显示图片用：

```text
![开源黑科技榜单](https://zzcsama.github.io/github-black-tech-ranking/social/github-black-tech-ranking.png)
```

网页里分享图用：

```text
https://zzcsama.github.io/github-black-tech-ranking/social/github-black-tech-ranking.png
```

## 目录说明

```text
data/ranking.sample.json       样例榜单数据
scripts/collect-github.js      调 GitHub API，保存快照并生成榜单 JSON
scripts/sync-site-data.js      同步榜单数据到 docs/data/ranking.json
scripts/cache-avatars.js       缓存 GitHub 头像到 docs/assets/avatars
scripts/render-svg.js          把榜单 JSON 渲染成 SVG 图片
scripts/serve.js               本地预览网页
data/ranking.generated.json
data/snapshots/YYYY-MM-DD.json
outputs/                       输出图片目录
.github/workflows/             GitHub Actions 自动化示例
```

## 自动化流程

推荐流程是每周日跑一次采集，保存当天快照，并发布榜单图。

```text
GitHub API
  -> data/snapshots/YYYY-MM-DD.json
  -> 计算 7 天增长
  -> docs/data/ranking.json
  -> docs/ 可点击网页
  -> outputs/github-black-tech-ranking.png
  -> 公众号 / X / 小红书 / GitHub README
```

## 每周日推送到 Telegram

`.github/workflows/weekly-ranking.yml` 会在每周日 09:00（北京时间）更新榜单。推荐直接用 Telegram Bot 推送，在仓库 Settings -> Secrets and variables -> Actions 中添加：

```text
Secrets:
TELEGRAM_BOT_TOKEN   Telegram BotFather 给你的 bot token
TELEGRAM_CHAT_ID     Telegram 频道 ID，或公开频道名，例如 @your_channel

Variables:
PUBLIC_PAGE_URL      GitHub Pages 页面地址
PUBLIC_IMAGE_URL     榜单 PNG 的公开地址，可选
```

把 bot 加进频道并设为管理员后，工作流会把榜单 PNG 和摘要直接发到频道。

如果你仍想走 Hermes，也可以额外配置：

```text
HERMES_WEBHOOK_URL
TELEGRAM_CHANNEL
```

没有配置 Telegram 或 Hermes 的 secret 时，工作流只更新网页和图片，不会推送。

## 后续可以增强的地方

- 接 OpenAI API，把 README 和 description 总结成更准的中文“大白话”。
- 用 Playwright 把 SVG/HTML 导出成 PNG，适合小红书、公众号封面。
- 增加分类榜，比如 AI Agent、视频生成、代码工具、RAG、开发者效率。
- 增加人工审核清单，避免把无关仓库或刷星仓库排进去。
