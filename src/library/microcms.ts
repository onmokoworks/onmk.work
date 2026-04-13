import type { MicroCMSQueries, MicroCMSListContent, MicroCMSImage, MicroCMSObjectContent } from "microcms-js-sdk";
import { createClient } from "microcms-js-sdk";

const client = createClient({
  serviceDomain: import.meta.env.MICROCMS_SERVICE_DOMAIN,
  apiKey: import.meta.env.MICROCMS_API_KEY,
});

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

export const getTags = async (queries?: MicroCMSQueries) => {
  return await client.getList<Tag>({ endpoint: "tags", queries });
};

export const getWorks = async (queries?: MicroCMSQueries) => {
  return await client.getList<Work>({ endpoint: "works", queries });
};

export type Script = {
  title: string;
  description?: string;
  tool?: string;
  url: string;
} & MicroCMSListContent;

export const getScripts = async (queries?: MicroCMSQueries) => {
  return await client.getList<Script>({ endpoint: "scripts", queries });
};

export type ScriptsPage = {
  title: string;
  description?: string;
} & MicroCMSObjectContent;

export const getScriptsPage = async (queries?: MicroCMSQueries) => {
  return await client.getObject<ScriptsPage>({ endpoint: "scripts-page", queries });
};

export type LogEntry = {
  images: MicroCMSImage[];
} & MicroCMSListContent;

export const getLogEntries = async (queries?: MicroCMSQueries) => {
  return await client.getList<LogEntry>({ endpoint: "log", queries });
};

export const getWorkDetail = async (
  contentId: string,
  queries?: MicroCMSQueries
) => {
  return await client.getListDetail<Work>({
    endpoint: "works",
    contentId,
    queries,
  });
};
