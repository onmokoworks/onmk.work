// Build-time GitHub fetch for the activity timeline.
// Public REST API is used, so no auth is strictly required. When a
// GITHUB_TOKEN env var is present it is sent to raise the rate limit
// (60/hr unauthenticated -> 5000/hr authenticated). All fetches are
// wrapped so that any failure (rate limit, network, missing repo)
// degrades to an empty result instead of breaking the site build.
//
// Results are cached to .runtime/github-cache.json with a TTL so that
// the dev server (which re-renders on every request) does not burn the
// unauthenticated 60/hr budget. On a failed fetch (e.g. rate limited)
// the last-good cache is reused regardless of age.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const GITHUB_USER = "onmokoworks";

const CACHE_PATH = join(process.cwd(), ".runtime", "github-cache.json");
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Repos to hide from the timeline (e.g. this site itself, throwaways).
const EXCLUDE_REPOS = new Set<string>(["onmk.work"]);

export interface GithubRepo {
  name: string;
  htmlUrl: string;
  description?: string;
  createdAt: string;
  language?: string;
}

export interface GithubRelease {
  repo: string;
  name: string;
  tagName: string;
  htmlUrl: string;
  publishedAt: string;
  body?: string;
}

function authHeaders(): Record<string, string> {
  const token = import.meta.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "onmk.work-build",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function ghFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type RawRepo = {
  name: string;
  html_url: string;
  description: string | null;
  created_at: string;
  language: string | null;
  fork: boolean;
  archived: boolean;
};

type RawRelease = {
  name: string | null;
  tag_name: string;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
  body: string | null;
};

export async function getGithubRepos(): Promise<GithubRepo[]> {
  const raw = await ghFetch<RawRepo[]>(
    `https://api.github.com/users/${GITHUB_USER}/repos?sort=created&direction=desc&per_page=100`,
  );
  if (!raw) return [];

  return raw
    .filter((r) => !r.fork && !r.archived && !EXCLUDE_REPOS.has(r.name))
    .map((r) => ({
      name: r.name,
      htmlUrl: r.html_url,
      description: r.description ?? undefined,
      createdAt: r.created_at,
      language: r.language ?? undefined,
    }));
}

export interface GithubActivity {
  repos: GithubRepo[];
  releases: GithubRelease[];
}

interface GithubCache extends GithubActivity {
  fetchedAt: number;
}

function readCache(): GithubCache | null {
  try {
    if (!existsSync(CACHE_PATH)) return null;
    return JSON.parse(readFileSync(CACHE_PATH, "utf8")) as GithubCache;
  } catch {
    return null;
  }
}

function writeCache(activity: GithubActivity) {
  try {
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify({ ...activity, fetchedAt: Date.now() }));
  } catch {
    // Cache is a best-effort optimization; ignore write failures.
  }
}

// Single entry point used by the timeline. Reuses a fresh cache without
// touching the API, fetches when stale, and falls back to any stale cache
// if the network/rate limit fails.
export async function getGithubActivity(): Promise<GithubActivity> {
  const cache = readCache();
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { repos: cache.repos, releases: cache.releases };
  }

  const repos = await getGithubRepos();
  if (repos.length === 0) {
    // Fetch failed or the account has no repos; prefer stale cache.
    return cache ? { repos: cache.repos, releases: cache.releases } : { repos: [], releases: [] };
  }

  const releases = await getGithubReleases(repos);
  const activity = { repos, releases };
  writeCache(activity);
  return activity;
}

export async function getGithubReleases(repos: GithubRepo[]): Promise<GithubRelease[]> {
  const perRepo = await Promise.all(
    repos.map(async (repo) => {
      const raw = await ghFetch<RawRelease[]>(
        `https://api.github.com/repos/${GITHUB_USER}/${repo.name}/releases?per_page=10`,
      );
      if (!raw) return [] as GithubRelease[];
      return raw
        .filter((rel) => !rel.draft && rel.published_at)
        .map((rel) => ({
          repo: repo.name,
          name: rel.name?.trim() || rel.tag_name,
          tagName: rel.tag_name,
          htmlUrl: rel.html_url,
          publishedAt: rel.published_at as string,
          body: rel.body ?? undefined,
        }));
    }),
  );
  return perRepo.flat();
}
