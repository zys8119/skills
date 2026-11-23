/**
 * 通过 GitHub 官方 REST API 拉取当前账号的全部 star 仓库，写入 ../stars.json。
 *
 * 用法：
 *   GITHUB_TOKEN=ghp_xxx node .agents/skills/github-stars/scripts/pull.ts
 *
 * Token 优先级：GITHUB_TOKEN / GH_TOKEN 环境变量 → 项目根目录 token.json 的 access_token。
 * stars.json 中已存在的中文简介与分类会按仓库全名保留，新仓库归入「未分类」。
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface StarredRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  created_at: string;
  updated_at: string;
}

interface StarsEntry {
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  createdAt: string;
  updatedAt: string;
  primaryCategory: string;
  primaryCategoryName: string;
  categories: string[];
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const starsPath = path.resolve(scriptDir, "../stars.json");
const rootTokenPath = path.resolve(scriptDir, "../../../../token.json");
const apiBase = process.env.GITHUB_API_BASE ?? "https://api.github.com";
const PER_PAGE = 100;

const UNCATEGORIZED = {
  primaryCategory: "other",
  primaryCategoryName: "未分类",
  categories: ["other"],
};

async function resolveToken(): Promise<string> {
  const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (envToken) return envToken;

  let raw: string;
  try {
    raw = await readFile(rootTokenPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        "未找到 GitHub Token：请设置 GITHUB_TOKEN 环境变量，或在项目根目录创建 token.json",
      );
    }
    throw error;
  }

  const saved = JSON.parse(raw) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!saved.access_token) {
    throw new Error("token.json 中缺少 access_token 字段");
  }
  if (saved.expires_in && saved.expires_in < Date.now()) {
    throw new Error(
      `token.json 中的 token 已于 ${new Date(saved.expires_in).toLocaleString()} 过期，请更换`,
    );
  }
  return saved.access_token;
}

async function fetchStarredPage(
  token: string,
  page: number,
): Promise<StarredRepo[]> {
  const url = new URL(`${apiBase}/user/starred`);
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("page", String(page));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.star+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `GitHub API ${response.status} ${response.statusText}: ${body.slice(0, 300)}`,
    );
  }

  const items = (await response.json()) as {
    starred_at: string;
    repo: StarredRepo;
  }[];
  return items.map((item) => item.repo);
}

async function readPreviousEntries(): Promise<Map<string, StarsEntry>> {
  try {
    const raw = await readFile(starsPath, "utf8");
    const entries = JSON.parse(raw) as StarsEntry[];
    return new Map(entries.map((entry) => [entry.name, entry]));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Map();
    }
    throw error;
  }
}

function toEntry(repo: StarredRepo, previous?: StarsEntry): StarsEntry {
  return {
    name: repo.full_name,
    description: previous?.description ?? repo.description ?? "",
    url: repo.html_url,
    language: repo.language ?? "Unknown",
    stars: repo.stargazers_count,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    primaryCategory: previous?.primaryCategory ?? UNCATEGORIZED.primaryCategory,
    primaryCategoryName:
      previous?.primaryCategoryName ?? UNCATEGORIZED.primaryCategoryName,
    categories: previous?.categories ?? [...UNCATEGORIZED.categories],
  };
}

async function main(): Promise<void> {
  const token = await resolveToken();
  const previous = await readPreviousEntries();
  const entries: StarsEntry[] = [];
  const seen = new Set<string>();

  for (let page = 1; ; page++) {
    const repos = await fetchStarredPage(token, page);
    for (const repo of repos) {
      if (seen.has(repo.full_name)) continue;
      seen.add(repo.full_name);
      entries.push(toEntry(repo, previous.get(repo.full_name)));
    }
    process.stderr.write(`已获取 ${entries.length} 个 star 仓库\n`);
    if (repos.length < PER_PAGE) break;
  }

  await writeFile(starsPath, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`共 ${entries.length} 个 star 仓库，已写入 ${starsPath}`);
}

main().catch((error: unknown) => {
  console.error(
    `获取失败：${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
