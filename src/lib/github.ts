export type Project = {
  name: string;
  description: string;
  url: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  createdAt: string;
  pushedAt: string;
  topics: string[];
};

export type GitHubPortfolio = {
  name: string;
  login: string;
  bio: string;
  company: string | null;
  profileUrl: string;
  blog: string | null;
  followers: number;
  publicRepos: number;
  projects: Project[];
  updatedAt: string;
  isLive: boolean;
};

const GITHUB_ACCOUNT = "ohakidev";
const GITHUB_TIMEOUT_MS = 6500;
const GITHUB_REVALIDATE_SECONDS = 3600;
const MAX_PROJECTS = 12;
const MAX_COUNT = 1_000_000_000;
const MAX_TOPICS = 20;
const MAX_TOPIC_LENGTH = 64;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

const fallback: GitHubPortfolio = {
  name: "ohaki",
  login: "ohakidev",
  bio: "research everything than can make life better",
  company: null,
  profileUrl: "https://github.com/ohakidev",
  blog: null,
  followers: 30,
  publicRepos: 7,
  updatedAt: "2026-07-22T02:20:51Z",
  isLive: false,
  projects: [
    {
      name: "binance-alpha-tool",
      description: "An evolving public repository.",
      url: "https://github.com/ohakidev/binance-alpha-tool",
      homepage: "https://binance-alpha-tool-chi.vercel.app",
      language: "TypeScript",
      stars: 1,
      forks: 0,
      createdAt: "2025-10-11T22:22:14Z",
      pushedAt: "2026-07-18T00:00:50Z",
      topics: [],
    },
    {
      name: "web3app",
      description: "An evolving public repository.",
      url: "https://github.com/ohakidev/web3app",
      homepage: "https://web3app-liard.vercel.app",
      language: "TypeScript",
      stars: 0,
      forks: 0,
      createdAt: "2025-03-17T23:06:04Z",
      pushedAt: "2025-08-12T14:10:37Z",
      topics: [],
    },
    {
      name: "stdactivitycheckV2",
      description: "Activity system for a university project built with Next.js and shadcn.",
      url: "https://github.com/ohakidev/stdactivitycheckV2",
      homepage: "https://stdactivitycheck-v2.vercel.app",
      language: "TypeScript",
      stars: 0,
      forks: 0,
      createdAt: "2023-07-10T20:52:04Z",
      pushedAt: "2024-10-30T13:47:32Z",
      topics: [],
    },
    {
      name: "stdactivity_check",
      description: "Project for checking student activity.",
      url: "https://github.com/ohakidev/stdactivity_check",
      homepage: "https://stdactivity-check.vercel.app",
      language: "JavaScript",
      stars: 0,
      forks: 0,
      createdAt: "2022-07-27T10:29:13Z",
      pushedAt: "2023-01-25T19:07:14Z",
      topics: [],
    },
    {
      name: "dvechontech",
      description: "เว็บเทคนิค",
      url: "https://github.com/ohakidev/dvechontech",
      homepage: null,
      language: null,
      stars: 0,
      forks: 0,
      createdAt: "2021-01-17T15:56:08Z",
      pushedAt: "2021-01-17T17:03:20Z",
      topics: [],
    },
    {
      name: "myport",
      description: "3D storytelling portfolio — live GitHub data as a living research world.",
      url: "https://github.com/ohakidev/myport",
      homepage: null,
      language: "TypeScript",
      stars: 0,
      forks: 0,
      createdAt: "2026-08-09T19:58:06Z",
      pushedAt: "2026-08-10T18:41:45Z",
      topics: [],
    },
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function optionalText(value: unknown, maxLength: number): string | null {
  const text = cleanText(value, maxLength);
  return text || null;
}

function publicUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (!input || input.length > 2048 || CONTROL_CHARACTERS.test(input)) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && url.hostname
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function githubUrl(value: unknown, repository = false): string | null {
  const href = publicUrl(value);
  if (!href) return null;
  const url = new URL(href);
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") return null;
  const path = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (path[0]?.toLowerCase() !== GITHUB_ACCOUNT || (repository && path.length < 2)) return null;
  return url.href;
}

function isoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (
    !input ||
    input.length > 64 ||
    CONTROL_CHARACTERS.test(input) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:?\d{2})$/.test(input)
  ) {
    return null;
  }
  const timestamp = Date.parse(input);
  if (!Number.isFinite(timestamp)) return null;
  const yearPart = Number(input.slice(0, 4));
  const monthPart = Number(input.slice(5, 7));
  const dayPart = Number(input.slice(8, 10));
  const daysInMonth = new Date(Date.UTC(yearPart, monthPart, 0)).getUTCDate();
  if (monthPart < 1 || monthPart > 12 || dayPart < 1 || dayPart > daysInMonth) return null;
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  return year >= 1970 && year <= 2100 ? date.toISOString() : null;
}

function safeCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return 0;
  return Math.min(value, MAX_COUNT);
}

function safeTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const topic of value) {
    const normalized = cleanText(topic, MAX_TOPIC_LENGTH);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= MAX_TOPICS) break;
  }
  return result;
}

function normalizeUser(value: unknown): Omit<GitHubPortfolio, "projects" | "isLive"> | null {
  if (!isRecord(value)) return null;
  const login = cleanText(value.login, 100);
  const profileUrl = githubUrl(value.html_url);
  const updatedAt = isoDate(value.updated_at);
  if (
    login.toLowerCase() !== GITHUB_ACCOUNT ||
    !profileUrl ||
    !updatedAt ||
    new URL(profileUrl).pathname.replace(/\/+$/, "").toLowerCase() !== `/${GITHUB_ACCOUNT}`
  ) {
    return null;
  }
  return {
    name: cleanText(value.name, 120) || login,
    login,
    bio: cleanText(value.bio, 500),
    company: optionalText(value.company, 200),
    profileUrl,
    blog: publicUrl(value.blog),
    followers: safeCount(value.followers),
    publicRepos: safeCount(value.public_repos),
    updatedAt,
  };
}

function normalizeRepo(value: unknown): Project | null {
  if (!isRecord(value) || value.fork !== false) return null;
  const name = cleanText(value.name, 120);
  const url = githubUrl(value.html_url, true);
  const createdAt = isoDate(value.created_at);
  const pushedAt = isoDate(value.pushed_at);
  if (!name || !url || !createdAt || !pushedAt) return null;
  const path = new URL(url).pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (path[1]?.toLowerCase() !== name.toLowerCase()) return null;
  return {
    name,
    description: cleanText(value.description, 2000),
    url,
    homepage: publicUrl(value.homepage),
    language: optionalText(value.language, 80),
    stars: safeCount(value.stargazers_count),
    forks: safeCount(value.forks_count),
    createdAt,
    pushedAt,
    topics: safeTopics(value.topics),
  };
}

function normalizePortfolio(userPayload: unknown, reposPayload: unknown): GitHubPortfolio | null {
  const user = normalizeUser(userPayload);
  if (!user || !Array.isArray(reposPayload)) return null;

  const projects: Project[] = [];
  for (const repoPayload of reposPayload) {
    if (!isRecord(repoPayload)) return null;
    if (repoPayload.fork === true) continue;
    const project = normalizeRepo(repoPayload);
    if (!project) return null;
    if (project.name.toLowerCase() === user.login.toLowerCase()) continue;
    projects.push(project);
  }

  projects.sort(
    (a, b) =>
      b.stars - a.stars ||
      b.pushedAt.localeCompare(a.pushedAt) ||
      a.name.localeCompare(b.name),
  );

  return {
    ...user,
    projects: projects.slice(0, MAX_PROJECTS),
    isLive: true,
  };
}

function fallbackSnapshot(): GitHubPortfolio {
  return {
    ...fallback,
    projects: fallback.projects.map((project) => ({ ...project, topics: [...project.topics] })),
  };
}

async function githubJson(input: string, headers: HeadersInit): Promise<unknown> {
  // Next's fetch cache bounds repeat API traffic; homepage URLs remain display-only and are never probed.
  const response = await fetch(input, {
    headers,
    next: { revalidate: GITHUB_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`GitHub request failed: ${response.status}`);
  const payload: unknown = await response.json();
  return payload;
}

export async function getGitHubPortfolio(): Promise<GitHubPortfolio> {
  try {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "ohakidev-portfolio",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const [userPayload, reposPayload] = await Promise.all([
      githubJson("https://api.github.com/users/ohakidev", headers),
      githubJson("https://api.github.com/users/ohakidev/repos?per_page=100&sort=updated", headers),
    ]);
    const portfolio = normalizePortfolio(userPayload, reposPayload);
    if (!portfolio) throw new Error("GitHub payload unavailable");
    return portfolio;
  } catch {
    return fallbackSnapshot();
  }
}
