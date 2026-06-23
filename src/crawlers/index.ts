import { eventbriteCrawler } from "@/crawlers/sources/eventbrite";
import { startupCouncilCrawler } from "@/crawlers/sources/startupcouncil";
import type { Crawler } from "@/crawlers/types";

export const crawlers: Record<string, Crawler> = {
  [eventbriteCrawler.sourceKey]: eventbriteCrawler,
  [startupCouncilCrawler.sourceKey]: startupCouncilCrawler,
};

export function getCrawler(sourceKey: string) {
  return crawlers[sourceKey] ?? null;
}

export function listCrawlers() {
  return Object.values(crawlers);
}

export { eventbriteCrawler, startupCouncilCrawler };
