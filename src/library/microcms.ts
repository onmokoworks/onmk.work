import type { MicroCMSQueries, MicroCMSListContent, MicroCMSImage } from "microcms-js-sdk";
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
  tag?: Tag;
  link?: string;
  year?: string;
} & MicroCMSListContent;

export const getTags = async (queries?: MicroCMSQueries) => {
  return await client.getList<Tag>({ endpoint: "tags", queries });
};

export const getWorks = async (queries?: MicroCMSQueries) => {
  return await client.getList<Work>({ endpoint: "works", queries });
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
