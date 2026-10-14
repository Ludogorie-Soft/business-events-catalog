import { enoCrawler } from "@/crawlers/sources/entrepreneursnightout";
import { eventbriteCrawler } from "@/crawlers/sources/eventbrite";
import { goSofiaCrawler } from "@/crawlers/sources/gosofia";
import { hillsOfBusinessCrawler } from "@/crawlers/sources/hillsofbusiness";
import { iecCrawler } from "@/crawlers/sources/iec";
import { meetupCrawler } from "@/crawlers/sources/meetup";
import { sofiaTechCrawler } from "@/crawlers/sources/sofiatech";
import { sofiaUpCrawler } from "@/crawlers/sources/sofiaup";
import { startupCouncilCrawler } from "@/crawlers/sources/startupcouncil";
import type { Crawler } from "@/crawlers/types";

export const crawlers: Record<string, Crawler> = {
  [eventbriteCrawler.sourceKey]: eventbriteCrawler,
  [goSofiaCrawler.sourceKey]: goSofiaCrawler,
  [hillsOfBusinessCrawler.sourceKey]: hillsOfBusinessCrawler,
  [iecCrawler.sourceKey]: iecCrawler,
  [enoCrawler.sourceKey]: enoCrawler,
  [meetupCrawler.sourceKey]: meetupCrawler,
  [sofiaTechCrawler.sourceKey]: sofiaTechCrawler,
  [sofiaUpCrawler.sourceKey]: sofiaUpCrawler,
  [startupCouncilCrawler.sourceKey]: startupCouncilCrawler,
};

export function getCrawler(sourceKey: string) {
  return crawlers[sourceKey] ?? null;
}

export function listCrawlers() {
  return Object.values(crawlers);
}

export {
  enoCrawler,
  eventbriteCrawler,
  goSofiaCrawler,
  hillsOfBusinessCrawler,
  iecCrawler,
  meetupCrawler,
  sofiaTechCrawler,
  sofiaUpCrawler,
  startupCouncilCrawler,
};
