import { decodeHtmlEntities } from "@/crawlers/fetch-html";
import type { CrawledEvent } from "@/crawlers/types";

const SOURCE_KEY = "hillsofbusiness";
// The site runs The Events Calendar plugin, which exposes a public JSON API.
const API_URL = "https://hillsofbusiness.com/wp-json/tribe/events/v1/events";
const ORGANIZER_NAME = "Hills of Business";
const PER_PAGE = 50;
const MAX_PAGES = 5;

type TribeVenue = {
  venue?: string;
  city?: string;
};

type TribeEvent = {
  id: number;
  url: string;
  title: string;
  description?: string;
  utc_start_date: string;
  utc_end_date?: string;
  all_day?: boolean;
  cost?: string;
  cost_details?: {
    currency_code?: string;
    values?: string[];
  };
  image?: { url?: string } | false;
  venue?: TribeVenue | TribeVenue[];
  website?: string;
};

type TribeResponse = {
  events: TribeEvent[];
  total_pages?: number;
};

async function fetchPage(page: number): Promise<TribeResponse> {
  const url = new URL(API_URL);
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("page", String(page));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return (await response.json()) as TribeResponse;
}

async function fetchAllEvents() {
  const events: TribeEvent[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await fetchPage(page);
    events.push(...response.events);
    if (!response.total_pages || page >= response.total_pages) break;
  }

  return events;
}

/** "2026-12-08 17:00:00" in UTC */
function parseUtcDate(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return undefined;
  const [, y, mo, d, h, mi, s] = match.map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s));
}

/** WordPress post HTML; drop anything that could run code or break layout. */
function cleanDescriptionHtml(html?: string) {
  const cleaned = html
    ?.replace(/<(script|style|iframe|form|noscript)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(?:img|input|button|embed|object)[^>]*>/gi, "")
    .replace(/\s(?:on\w+|style|class|id)\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/href\s*=\s*"\s*javascript:[^"]*"/gi, 'href="#"')
    .replace(/<p>\s*(?:&nbsp;)?\s*<\/p>/gi, "")
    .trim();
  return cleaned || undefined;
}

function firstVenue(venue?: TribeVenue | TribeVenue[]) {
  return Array.isArray(venue) ? venue[0] : venue;
}

function parsePrice(event: TribeEvent): Pick<
  CrawledEvent,
  "priceType" | "priceMin" | "priceMax" | "currency"
> {
  const cost = decodeHtmlEntities(event.cost ?? "").trim();
  if (/свободен|безплат|free/i.test(cost)) return { priceType: "free" };

  const amounts = (event.cost_details?.values ?? [])
    .map(Number)
    .filter((value) => !Number.isNaN(value));
  if (amounts.length === 0) return { priceType: "unknown" };

  const priceMin = Math.min(...amounts);
  const priceMax = Math.max(...amounts);
  if (priceMax === 0) return { priceType: "free" };

  return {
    priceType: "paid",
    priceMin,
    priceMax: priceMax > priceMin ? priceMax : undefined,
    currency: event.cost_details?.currency_code?.toUpperCase(),
  };
}

function mapEvent(event: TribeEvent): CrawledEvent | null {
  const startAt = parseUtcDate(event.utc_start_date);
  const title = decodeHtmlEntities(event.title ?? "").trim();
  if (!startAt || !title) return null;

  const endAt = parseUtcDate(event.utc_end_date);
  const venue = firstVenue(event.venue);

  return {
    sourceKey: SOURCE_KEY,
    sourceEventId: String(event.id),
    title,
    descriptionHtml: cleanDescriptionHtml(event.description),
    startAt,
    endAt: endAt && endAt > startAt ? endAt : undefined,
    city: "plovdiv",
    locationType: "physical",
    venueName: venue?.venue ? decodeHtmlEntities(venue.venue).trim() : undefined,
    registrationUrl: event.website || event.url,
    externalUrl: event.url,
    ...parsePrice(event),
    language: "bg",
    organizerName: ORGANIZER_NAME,
    tags: ["networking"],
    topics: ["entrepreneurship"],
    eventTypeSlug: "networking",
    coverImageUrl: event.image ? event.image.url : undefined,
  };
}

export const hillsOfBusinessCrawler = {
  sourceKey: SOURCE_KEY,
  async crawl(): Promise<CrawledEvent[]> {
    const events = await fetchAllEvents();
    return events
      .map(mapEvent)
      .filter((event): event is CrawledEvent => event !== null);
  },
};
