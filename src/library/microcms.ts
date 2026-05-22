import type { MicroCMSQueries, MicroCMSListContent, MicroCMSImage, MicroCMSObjectContent } from "microcms-js-sdk";
import { createClient } from "microcms-js-sdk";
import { mockLogEntries, mockTags, mockTools, mockToolsPage, mockWorks } from "./mock-data";

const serviceDomain = import.meta.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = import.meta.env.MICROCMS_API_KEY;
const hasMicrocmsCredentials = Boolean(serviceDomain && apiKey);

const client = hasMicrocmsCredentials
  ? createClient({
      serviceDomain,
      apiKey,
    })
  : null;

export type Tag = {
  title: string;
} & MicroCMSListContent;

export type Work = {
  title: string;
  description?: string;
  images?: MicroCMSImage[];
  tag?: Tag[];
  link?: string;
  "url-Youtube"?: string;
  year?: string;
  credit?: string;
} & MicroCMSListContent;

export type Tool = {
  title: string;
  slug?: string;
  thumbnail?: MicroCMSImage;
  summary?: string;
  description?: string;
  tool?: string;
  url: string;
} & MicroCMSListContent;

export type ToolsPage = {
  title: string;
  description?: string;
} & MicroCMSObjectContent;

export type LogEntry = {
  images: MicroCMSImage[];
} & MicroCMSListContent;

function applyQueryLimit<T>(items: T[], queries?: MicroCMSQueries) {
  const limit = typeof queries?.limit === "number" ? queries.limit : items.length;
  return items.slice(0, limit);
}

function sortMaybe<T extends { publishedAt?: string }>(items: T[], queries?: MicroCMSQueries) {
  if (queries?.orders === "-publishedAt") {
    return [...items].sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
  }
  return [...items];
}

async function getListFallback<T extends { id: string; publishedAt?: string }>(items: T[], queries?: MicroCMSQueries) {
  return {
    contents: applyQueryLimit(sortMaybe(items, queries), queries),
    totalCount: items.length,
    offset: 0,
    limit: typeof queries?.limit === "number" ? queries.limit : items.length,
  };
}

export const getTags = async (queries?: MicroCMSQueries) => {
  if (client) {
    return await client.getList<Tag>({ endpoint: "tags", queries });
  }
  return await getListFallback<Tag>(mockTags as Tag[], queries);
};

export const getWorks = async (queries?: MicroCMSQueries) => {
  if (client) {
    return await client.getList<Work>({ endpoint: "works", queries });
  }
  return await getListFallback<Work>(mockWorks as Work[], queries);
};

export const getTools = async (queries?: MicroCMSQueries) => {
  if (client) {
    try {
      return await client.getList<Tool>({ endpoint: "tools", queries });
    } catch {
      return await client.getList<Tool>({ endpoint: "scripts", queries });
    }
  }
  return await getListFallback<Tool>(mockTools as Tool[], queries);
};

export const getToolBySlug = async (slug: string) => {
  const response = await getTools({ orders: "-publishedAt", limit: 100 });
  const item = response.contents.find((tool) => (tool.slug ?? tool.id) === slug);
  if (!item) {
    throw new Error(`Unknown tool slug: ${slug}`);
  }
  return item;
};

export const getToolsPage = async (queries?: MicroCMSQueries) => {
  if (client) {
    try {
      return await client.getObject<ToolsPage>({ endpoint: "tools-page", queries });
    } catch {
      return await client.getObject<ToolsPage>({ endpoint: "scripts-page", queries });
    }
  }
  return mockToolsPage as ToolsPage;
};

export const getLogEntries = async (queries?: MicroCMSQueries) => {
  if (client) {
    return await client.getList<LogEntry>({ endpoint: "log", queries });
  }
  return await getListFallback<LogEntry>(mockLogEntries as LogEntry[], queries);
};

export const getWorkDetail = async (contentId: string, queries?: MicroCMSQueries) => {
  if (client) {
    return await client.getListDetail<Work>({
      endpoint: "works",
      contentId,
      queries,
    });
  }

  const item = (mockWorks as Work[]).find((work) => work.id === contentId);
  if (!item) {
    throw new Error(`Unknown mock work: ${contentId}`);
  }
  return item;
};

export const isUsingMockMicrocms = !hasMicrocmsCredentials;


export type Script = Tool;
export type ScriptsPage = ToolsPage;
export const getScripts = getTools;
export const getScriptBySlug = getToolBySlug;
export const getScriptsPage = getToolsPage;



