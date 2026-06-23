import { enoCrawler } from "@/crawlers/sources/entrepreneursnightout";
import { eventbriteCrawler } from "@/crawlers/sources/eventbrite";
import { iecCrawler } from "@/crawlers/sources/iec";
import { sofiaTechCrawler } from "@/crawlers/sources/sofiatech";
import { startupCouncilCrawler } from "@/crawlers/sources/startupcouncil";
import type { Crawler } from "@/crawlers/types";

export const crawlers: Record<string, Crawler> = {
  [eventbriteCrawler.sourceKey]: eventbriteCrawler,
  [iecCrawler.sourceKey]: iecCrawler,
  [enoCrawler.sourceKey]: enoCrawler,
  [sofiaTechCrawler.sourceKey]: sofiaTechCrawler,
  [startupCouncilCrawler.sourceKey]: startupCouncilCrawler,
};

export function getCrawler(sourceKey: string) {
  return crawlers[sourceKey] ?? null;
}

export function listCrawlers() {
  return Object.values(crawlers);
}

export { enoCrawler, eventbriteCrawler, iecCrawler, sofiaTechCrawler, startupCouncilCrawler };
