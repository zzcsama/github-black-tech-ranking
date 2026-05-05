# 发布到 GitHub

当前项目已经整理好，可以作为 GitHub Pages 静态站点发布。

## 推荐仓库名

```text
github-black-tech-ranking
```

如果使用当前 GitHub 账号，最终仓库通常是：

```text
zzcsama/github-black-tech-ranking
```

## 上传步骤

在 GitHub 新建一个空仓库后，在本机终端运行：

```bash
cd /Users/zhongchenzhang/Documents/Codex/2026-05-05/files-mentioned-by-the-user-hhedugca4aamt5r
git init
git add .
git commit -m "Initial GitHub ranking site"
git branch -M main
git remote add origin https://github.com/zzcsama/github-black-tech-ranking.git
git push -u origin main
```

如果你用的是别的仓库名，把最后两行里的地址换成你的仓库地址。

## 打开 GitHub Pages

推送后进入仓库：

```text
Settings -> Pages
```

Source 选择：

```text
GitHub Actions
```

之后 `.github/workflows/pages.yml` 会把 `docs/` 目录发布成网页。

## 页面和图片

网页入口：

```text
docs/index.html
```

README 图片：

```text
https://zzcsama.github.io/github-black-tech-ranking/social/github-black-tech-ranking.png
```

社媒图片：

```text
https://zzcsama.github.io/github-black-tech-ranking/social/github-black-tech-ranking.png
```

真实数据自动更新：

```text
.github/workflows/weekly-ranking.yml
```

## Telegram 推送

工作流每天 09:00（北京时间）采集一次快照；每周日 09:10（北京时间）推送到 Telegram。推荐直接用 Telegram Bot 推送。在仓库 Settings -> Secrets and variables -> Actions 中添加：

```text
Secrets:
DEEPSEEK_API_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID

Variables:
DEEPSEEK_MODEL
PUBLIC_PAGE_URL
PUBLIC_IMAGE_URL
```

`TELEGRAM_CHAT_ID` 可以是公开频道名，例如 `@your_channel`；私有频道通常是 `-100...` 开头的数字。Bot 需要加入频道并设为管理员。

`DEEPSEEK_MODEL` 不填也可以，默认使用 `deepseek-v4-flash`。没有配置 `DEEPSEEK_API_KEY` 时，榜单仍会更新，只是中文解释会使用内置规则。

第一次没有 7 天前快照时，增长会显示“新上榜”。运行一周后，就会显示真实的本周 Star 增长。

如需继续使用 Hermes，可额外配置：

```text
HERMES_WEBHOOK_URL
TELEGRAM_CHANNEL
```
