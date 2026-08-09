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
const CACHE_VERSION = 3; // bump when the fetch/filter shape changes to invalidate old caches

// Allowlist: a repo only appears on the timeline when it carries this
// GitHub topic. Toggle visibility from the repo's About > Topics on
// GitHub — no code change or redeploy config needed.
const SHOWCASE_TOPIC = "onmk-show";

// Repos to hide even if tagged (e.g. this site itself, throwaways).
const EXCLUDE_REPOS = new Set<string>(["onmk.work"]);

export interface GithubRepo {
  name: string;
  htmlUrl: string;
  description?: string;
  createdAt: string;
  language?: string;
  thumbnail?: string; // first non-badge image found in the repo README
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
  topics?: string[];
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

// Pull the first "real" image out of a repo README to use as its thumbnail.
// Badges (shields.io, CI status, coverage, svg) are skipped, and relative /
// GitHub-blob paths are resolved to raw.githubusercontent.com URLs.
const README_IMG_RE = /!\[[^\]]*\]\(\s*<?([^)>\s]+)>?[^)]*\)|<img[^>]+\bsrc\s*=\s*["']([^"']+)["']/gi;

function isBadgeUrl(u: string): boolean {
  return /shields\.io|badgen\.net|badge|\.svg(?:$|[?#])|actions\/workflows|codecov|coveralls|circleci|travis|appveyor|sonarcloud|deepsource|visitor|hits\./i.test(
    u,
  );
}

function resolveReadmeImage(url: string, readmeRawUrl: string): string | undefined {
  const gh = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/i);
  if (gh) return `https://raw.githubusercontent.com/${gh[1]}/${gh[2]}/${gh[3]}`;
  if (/^https?:\/\//i.test(url)) return url;
  try {
    return new URL(url, readmeRawUrl).href;
  } catch {
    return undefined;
  }
}

function firstReadmeImage(markdown: string, readmeRawUrl: string): string | undefined {
  README_IMG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = README_IMG_RE.exec(markdown))) {
    const raw = (m[1] || m[2] || "").trim();
    if (!raw || raw.startsWith("data:") || isBadgeUrl(raw)) continue;
    const resolved = resolveReadmeImage(raw, readmeRawUrl);
    if (resolved) return resolved;
  }
  return undefined;
}

async function getRepoReadmeImage(repo: string): Promise<string | undefined> {
  const meta = await ghFetch<{ content?: string; download_url?: string }>(
    `https://api.github.com/repos/${GITHUB_USER}/${repo}/readme`,
  );
  if (!meta?.content || !meta.download_url) return undefined;
  try {
    const markdown = Buffer.from(meta.content, "base64").toString("utf8");
    return firstReadmeImage(markdown, meta.download_url);
  } catch {
    return undefined;
  }
}

// Returns null when the API call itself failed (network/rate limit) so the
// caller can fall back to cache; an empty array means "fetched fine, nothing
// tagged with the showcase topic".
export async function getGithubRepos(): Promise<GithubRepo[] | null> {
  const raw = await ghFetch<RawRepo[]>(
    `https://api.github.com/users/${GITHUB_USER}/repos?sort=created&direction=desc&per_page=100`,
  );
  if (!raw) return null;

  const repos = raw
    .filter(
      (r) =>
        !r.fork &&
        !r.archived &&
        !EXCLUDE_REPOS.has(r.name) &&
        (r.topics ?? []).includes(SHOWCASE_TOPIC),
    )
    .map((r) => ({
      name: r.name,
      htmlUrl: r.html_url,
      description: r.description ?? undefined,
      createdAt: r.created_at,
      language: r.language ?? undefined,
    }));

  // Attach README thumbnails (one extra call per allowlisted repo).
  return Promise.all(
    repos.map(async (r) => ({ ...r, thumbnail: await getRepoReadmeImage(r.name) })),
  );
}

export interface GithubActivity {
  repos: GithubRepo[];
  releases: GithubRelease[];
}

interface GithubCache extends GithubActivity {
  fetchedAt: number;
  version?: number;
}

function readCache(): GithubCache | null {
  try {
    if (!existsSync(CACHE_PATH)) return null;
    const cache = JSON.parse(readFileSync(CACHE_PATH, "utf8")) as GithubCache;
    if (cache.version !== CACHE_VERSION) return null; // stale schema, refetch
    return cache;
  } catch {
    return null;
  }
}

function writeCache(activity: GithubActivity) {
  try {
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    writeFileSync(
      CACHE_PATH,
      JSON.stringify({ ...activity, version: CACHE_VERSION, fetchedAt: Date.now() }),
    );
  } catch {
    // Cache is a best-effort optimization; ignore write failures.
  }
}

// Single entry point used by the timeline. Reuses a fresh cache without
// touching the API, fetches when stale, and falls back to any stale cache
// if the network/rate limit fails. The same 30-minute freshness window is
// used in development so navigating back to the timeline stays responsive.
export async function getGithubActivity(): Promise<GithubActivity> {
  const cache = readCache();
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { repos: cache.repos, releases: cache.releases };
  }

  const repos = await getGithubRepos();
  if (repos === null) {
    // The fetch itself failed; prefer stale cache over showing nothing.
    return cache ? { repos: cache.repos, releases: cache.releases } : { repos: [], releases: [] };
  }

  // repos may legitimately be empty (nothing tagged yet); cache that too.
  const releases = repos.length > 0 ? await getGithubReleases(repos) : [];
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
