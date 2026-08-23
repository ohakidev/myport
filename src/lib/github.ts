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

type GitHubUser = {
  name: string | null;
  login: string;
  bio: string | null;
  company: string | null;
  html_url: string;
  blog: string | null;
  followers: number;
  public_repos: number;
  updated_at: string;
};

type GitHubRepo = {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  pushed_at: string;
  topics?: string[];
  fork: boolean;
};

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

export async function getGitHubPortfolio(): Promise<GitHubPortfolio> {
  try {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "ohakidev-portfolio",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const [userResponse, reposResponse] = await Promise.all([
      fetch("https://api.github.com/users/ohakidev", {
        headers,
        next: { revalidate: 3600 },
      }),
      fetch("https://api.github.com/users/ohakidev/repos?per_page=100&sort=updated", {
        headers,
        next: { revalidate: 3600 },
      }),
    ]);

    if (!userResponse.ok || !reposResponse.ok) throw new Error("GitHub API unavailable");

    const user = (await userResponse.json()) as GitHubUser;
    const repos = (await reposResponse.json()) as GitHubRepo[];
    const projects = repos
      .filter((repo) => !repo.fork && repo.name !== user.login)
      .sort(
        (a, b) =>
          b.stargazers_count - a.stargazers_count ||
          Date.parse(b.pushed_at) - Date.parse(a.pushed_at),
      )
      .slice(0, 12)
      .map((repo) => ({
        name: repo.name,
        description: repo.description ?? "An evolving public repository.",
        url: repo.html_url,
        homepage: repo.homepage || null,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        createdAt: repo.created_at,
        pushedAt: repo.pushed_at,
        topics: repo.topics ?? [],
      }));

    return {
      name: user.name ?? user.login,
      login: user.login,
      bio: user.bio ?? "Fullstack Engineer",
      company: user.company,
      profileUrl: user.html_url,
      blog: user.blog || null,
      followers: user.followers,
      publicRepos: user.public_repos,
      projects,
      updatedAt: user.updated_at,
      isLive: true,
    };
  } catch {
    return fallback;
  }
}
