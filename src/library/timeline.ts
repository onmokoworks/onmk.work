// Aggregates every activity source into one normalized, date-sorted
// changelog. Each source is fetched independently and failures degrade
// to an empty list so a single broken source never breaks the build.

import { getBlogPosts, getWorks, type BlogPost, type Work } from "./microcms";
import { getYouTubeThumbnails } from "./youtube";

export type TimelineKind = "work" | "tool" | "blog";

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
  thumbnail?: string; // image URL when the source has one (works/tools/blog)
  thumbnailFallback?: string; // fallback when a YouTube max-resolution image is unavailable
  emojiCode?: string; // per-entry Twemoji override
}

// microCMS image assets accept resize query params.
function thumb(url?: string) {
  return url ? `${url}?w=720&h=450&fit=crop` : undefined;
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
  return works.map((work) => {
    const youtubeThumbnail = getYouTubeThumbnails(work["url-Youtube"]);
    return {
    id: `work-${work.id}`,
    kind: "work",
    date: work.publishedAt,
    title: work.title,
    summary: work.description ? clamp(stripHtml(work.description)) : undefined,
    href: `/works/${work.id}`,
    external: false,
    badge: "Work",
    thumbnail: youtubeThumbnail?.primary ?? thumb(work.images?.[0]?.url),
    thumbnailFallback: youtubeThumbnail?.fallback,
    emojiCode: work.tag?.some((tag) => tag.title.trim().toLowerCase() === "book design")
      ? "1f4d6"
      : undefined,
    };
  });
}

function blogToEntries(posts: BlogPost[]): TimelineEntry[] {
  return posts.map((post) => ({
    id: `blog-${post.id}`,
    kind: "blog",
    date: post.publishedAt,
    title: post.title,
    summary: post.excerpt ? clamp(post.excerpt) : post.body ? clamp(stripHtml(post.body)) : undefined,
    href: `/writings/${post.slug ?? post.id}`,
    external: false,
    badge: "Writing",
    thumbnail: thumb(post.eyecatch?.url),
  }));
}

export async function getTimeline(): Promise<TimelineYear[]> {
  const [worksRes, blogRes] = await Promise.all([
    safe(getWorks({ orders: "-publishedAt", limit: 100 }), { contents: [] as Work[] } as any),
    safe(getBlogPosts({ orders: "-publishedAt", limit: 100 }), { contents: [] as BlogPost[] } as any),
  ]);

  const entries: TimelineEntry[] = [
    ...worksToEntries(worksRes.contents),
    ...blogToEntries(blogRes.contents),
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
