export type CrawledLocationType = "physical" | "online" | "hybrid";
export type CrawledPriceType = "free" | "paid" | "unknown";
export type CrawledLanguage = "bg" | "en" | "mixed";

export type CrawledEvent = {
  sourceKey: string;
  sourceEventId?: string;
  title: string;
  descriptionHtml?: string;
  startAt: Date;
  endAt?: Date;
  city?: string;
  locationType: CrawledLocationType;
  venueName?: string;
  registrationUrl?: string;
  externalUrl: string;
  priceType?: CrawledPriceType;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  language?: CrawledLanguage;
  organizerName?: string;
  tags?: string[];
  /** Topic slugs; also inferred from title/description during import. */
  topics?: string[];
  /** Event type slug; also inferred from title/location during import. */
  eventTypeSlug?: string;
  coverImageUrl?: string;
};

export type CrawlerResult = {
  sourceKey: string;
  events: CrawledEvent[];
  error?: string;
};

export type Crawler = {
  sourceKey: string;
  crawl: () => Promise<CrawledEvent[]>;
};

export type ImportEventsResult = {
  eventsFound: number;
  eventsCreated: number;
  eventsUpdated: number;
};

export type CrawlSourceResult = ImportEventsResult & {
  sourceKey: string;
  status: "success" | "failed";
  errorMessage?: string;
};

export type CrawlAllResult = {
  processed: number;
  succeeded: number;
  failed: number;
  eventsFound: number;
  eventsCreated: number;
  eventsUpdated: number;
  results: CrawlSourceResult[];
};
