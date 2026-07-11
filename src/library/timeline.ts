// Aggregates every activity source into one normalized, date-sorted
// changelog. Each source is fetched independently and failures degrade
// to an empty list so a single broken source never breaks the build.

import { getBlogPosts, getTools, getWorks, type BlogPost, type Tool, type Work } from "./microcms";
import { getGithubReleases, getGithubRepos } from "./github";

export type TimelineKind = "work" | "tool" | "blog" | "repo" | "release";

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  date: string; // ISO
  title: string;
  summary?: string;
  href: string;
  external: boolean;
  badge: string; // human label shown next to the date
  meta?: string; // small trailing detail (release tag, language, ...)
}

export interface TimelineYear {
  year: number;
  entries: TimelineEntry[];
}

function stripHtml(html?: string) {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function clamp(text: string, max = 90) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

function worksToEntries(works: Work[]): TimelineEntry[] {
  return works.map((work) => ({
    id: `work-${work.id}`,
    kind: "work",
    date: work.publishedAt,
    title: work.title,
    summary: work.description ? clamp(stripHtml(work.description)) : undefined,
    href: `/works/${work.id}`,
    external: false,
    badge: "Work",
  }));
}

function toolsToEntries(tools: Tool[]): TimelineEntry[] {
  return tools.map((tool) => ({
    id: `tool-${tool.id}`,
    kind: "tool",
    date: tool.publishedAt,
    title: tool.title,
    summary: tool.summary ? clamp(tool.summary) : undefined,
    href: `/tools/${tool.slug ?? tool.id}`,
    external: false,
    badge: "Tool",
  }));
}

function blogToEntries(posts: BlogPost[]): TimelineEntry[] {
  return posts.map((post) => ({
    id: `blog-${post.id}`,
    kind: "blog",
    date: post.publishedAt,
    title: post.title,
    summary: post.excerpt ? clamp(post.excerpt) : post.body ? clamp(stripHtml(post.body)) : undefined,
    href: `/blog/${post.slug ?? post.id}`,
    external: false,
    badge: "Blog",
  }));
}

export async function getTimeline(): Promise<TimelineYear[]> {
  const [worksRes, toolsRes, blogRes, repos] = await Promise.all([
    safe(getWorks({ orders: "-publishedAt", limit: 100 }), { contents: [] as Work[] } as any),
    safe(getTools({ orders: "-publishedAt", limit: 100 }), { contents: [] as Tool[] } as any),
    safe(getBlogPosts({ orders: "-publishedAt", limit: 100 }), { contents: [] as BlogPost[] } as any),
    safe(getGithubRepos(), []),
  ]);

  const releases = await safe(getGithubReleases(repos), []);

  const entries: TimelineEntry[] = [
    ...worksToEntries(worksRes.contents),
    ...toolsToEntries(toolsRes.contents),
    ...blogToEntries(blogRes.contents),
    ...repos.map((repo) => ({
      id: `repo-${repo.name}`,
      kind: "repo" as const,
      date: repo.createdAt,
      title: repo.name,
      summary: repo.description ? clamp(repo.description) : undefined,
      href: repo.htmlUrl,
      external: true,
      badge: "Repository",
      meta: repo.language,
    })),
    ...releases.map((rel) => ({
      id: `release-${rel.repo}-${rel.tagName}`,
      kind: "release" as const,
      date: rel.publishedAt,
      title: `${rel.repo} ${rel.tagName}`,
      summary: rel.body ? clamp(stripHtml(rel.body)) : undefined,
      href: rel.htmlUrl,
      external: true,
      badge: "Release",
    })),
  ].filter((entry) => Boolean(entry.date));

  entries.sort((a, b) => b.date.localeCompare(a.date));

  // Group by year, preserving the sorted order within each group.
  const byYear = new Map<number, TimelineEntry[]>();
  for (const entry of entries) {
    const year = new Date(entry.date).getFullYear();
    const bucket = byYear.get(year);
    if (bucket) bucket.push(entry);
    else byYear.set(year, [entry]);
  }

  return Array.from(byYear.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({ year, entries: list }));
}
