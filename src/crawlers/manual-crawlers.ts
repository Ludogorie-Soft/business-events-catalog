import { devBgManualCrawler } from "@/crawlers/sources/devbg";
import type { CrawledEvent } from "@/crawlers/types";

export type ManualEventCrawler = {
  sourceKey: string;
  label: string;
  websiteHost: string;
  placeholder: string;
  crawlFromUrl: (url: string) => Promise<CrawledEvent>;
};

export const manualCrawlers: Record<string, ManualEventCrawler> = {
  [devBgManualCrawler.sourceKey]: devBgManualCrawler,
};

export const manualCrawlSources = Object.values(manualCrawlers).map(
  ({ sourceKey, label, placeholder }) => ({
    sourceKey,
    label,
    placeholder,
  })
);

export function getManualCrawler(sourceKey: string) {
  return manualCrawlers[sourceKey] ?? null;
}
