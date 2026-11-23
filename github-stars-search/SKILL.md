---
name: github-stars
description: 使用此技能搜索github上的star项目
---

读取`stars.json`文件，获取star项目的列表。

## 更新数据

`scripts/pull.ts` 通过 GitHub 官方 REST API（`GET /user/starred`）分页拉取全部 star 仓库并写入 `stars.json`：

```bash
GITHUB_TOKEN=ghp_xxx node .agents/skills/github-stars/scripts/pull.ts
```

Token 也可放在项目根目录 `token.json`（`access_token` 字段，支持 `expires_in` 过期校验）。已有仓库的中文简介与分类会按仓库全名保留，新增仓库标记为「未分类」。

## 搜索star项目

读取`stars.json`文件，根据用户的问题，从star项目列表中提取相关的信息。