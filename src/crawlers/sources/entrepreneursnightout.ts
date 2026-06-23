import {
  decodeHtmlEntities,
  fetchHtml,
  stripHtml,
} from "@/crawlers/fetch-html";
import type { CrawledEvent } from "@/crawlers/types";

const SOURCE_KEY = "eno";
const BASE_URL = "https://entrepreneursnightout.org";
const LISTING_URL = `${BASE_URL}/events/`;
const ORGANIZER_NAME = "Entrepreneurs Night Out";

const ALLOWED_CITY_SLUGS = new Set(["sofia", "vratsa", "montana", "pleven"]);

const CITY_NAME_TO_SLUG: Record<string, string> = {
  sofia: "sofia",
  vratsa: "vratsa",
  montana: "montana",
  pleven: "pleven",
};

type ParsedListingEvent = {
  sourceEventId: string;
  title: string;
  startAt: Date;
  externalUrl: string;
  coverImageUrl?: string;
};

type EnrichedListingEvent = ParsedListingEvent & {
  citySlug: string;
};

function toSofiaUtc(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number
) {
  const isSummer = month >= 4 && month <= 10;
  const offsetHours = isSummer ? 3 : 2;
  return new Date(Date.UTC(year, month - 1, day, hours - offsetHours, minutes));
}

function parseEventDate(text: string) {
  const match = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;

  return toSofiaUtc(
    Number(match[3]),
    Number(match[2]),
    Number(match[1]),
    19,
    0
  );
}

function normalizeExternalUrl(url: string) {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "");
}

function extractSourceEventId(url: string) {
  const slug = new URL(url).pathname.match(/\/event\/([^/]+)\/?$/i)?.[1];
  return slug ?? url;
}

function extractCityFromTitle(title: string) {
  const cityTag = title.match(/^\[([^\]]+)\]/i)?.[1]?.trim().toLowerCase();
  if (!cityTag) return null;
  return CITY_NAME_TO_SLUG[cityTag] ?? null;
}

function hasExplicitCityTag(title: string) {
  return /^\[[^\]]+\]/i.test(title.trim());
}

function extractCityFromUrl(url: string) {
  const slug = new URL(url).pathname.match(
    /\/event\/(sofia|vratsa|montana|pleven)-/i
  )?.[1];
  return slug?.toLowerCase() ?? null;
}

function extractCityFromHtml(html: string) {
  const pageTitle = decodeHtmlEntities(
    stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "")
  );
  const fromTitle = extractCityFromTitle(pageTitle);
  if (fromTitle) return fromTitle;

  const mapsDestination = html.match(
    /google\.com\/maps[^"'\\]*destination=([^"'\\]+)/i
  )?.[1];
  if (mapsDestination) {
    const decoded = decodeHtmlEntities(
      decodeURIComponent(mapsDestination.replace(/&#038;/g, "&"))
    );
    for (const [name, slug] of Object.entries(CITY_NAME_TO_SLUG)) {
      if (new RegExp(`\\b${name}\\b`, "i").test(decoded)) {
        return slug;
      }
    }
  }

  return null;
}

async function resolveCitySlug(title: string, eventUrl: string) {
  if (hasExplicitCityTag(title)) {
    return extractCityFromTitle(title);
  }

  const fromUrl = extractCityFromUrl(eventUrl);
  if (fromUrl) return fromUrl;

  const html = await fetchHtml(eventUrl);
  return extractCityFromHtml(html);
}

function parseLoopItem(block: string): Omit<ParsedListingEvent, "citySlug"> | null {
  const titleHtml = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1];
  const eventUrl = block.match(
    /href="(https:\/\/entrepreneursnightout\.org\/event\/[^"]+)"/i
  )?.[1];

  if (!titleHtml || !eventUrl) return null;

  const title = decodeHtmlEntities(stripHtml(titleHtml));
  const dateText = block.match(/(\d{2}\.\d{2}\.\d{4})/)?.[1];
  if (!title || !dateText) return null;

  const startAt = parseEventDate(dateText);
  if (!startAt || Number.isNaN(startAt.getTime())) return null;

  const externalUrl = normalizeExternalUrl(eventUrl);
  const coverImageUrl = block.match(
    /src="(https:\/\/entrepreneursnightout\.org\/wp-content\/uploads[^"]+)"/i
  )?.[1];

  return {
    sourceEventId: extractSourceEventId(externalUrl),
    title,
    startAt,
    externalUrl,
    coverImageUrl,
  };
}

function parseListingEvents(html: string) {
  const blocks = [
    ...html.matchAll(
      /data-elementor-type="loop-item"[\s\S]*?(?=data-elementor-type="loop-item"|$)/g
    ),
  ];

  const byUrl = new Map<string, Omit<ParsedListingEvent, "citySlug">>();

  for (const match of blocks) {
    const parsed = parseLoopItem(match[0]);
    if (parsed) {
      byUrl.set(parsed.externalUrl, parsed);
    }
  }

  return [...byUrl.values()];
}

async function enrichWithCity(
  events: ParsedListingEvent[]
): Promise<EnrichedListingEvent[]> {
  const enriched: EnrichedListingEvent[] = [];

  for (const event of events) {
    const citySlug = await resolveCitySlug(event.title, event.externalUrl);
    if (!citySlug || !ALLOWED_CITY_SLUGS.has(citySlug)) {
      continue;
    }

    enriched.push({ ...event, citySlug });
  }

  return enriched;
}

function mapListingEvent(event: EnrichedListingEvent): CrawledEvent {
  return {
    sourceKey: SOURCE_KEY,
    sourceEventId: event.sourceEventId,
    title: event.title,
    startAt: event.startAt,
    city: event.citySlug,
    locationType: "physical",
    registrationUrl: event.externalUrl,
    externalUrl: event.externalUrl,
    priceType: "unknown",
    language: "mixed",
    organizerName: ORGANIZER_NAME,
    tags: ["startup", "networking"],
    coverImageUrl: event.coverImageUrl,
  };
}

export const enoCrawler = {
  sourceKey: SOURCE_KEY,
  async crawl(): Promise<CrawledEvent[]> {
    const html = await fetchHtml(LISTING_URL);
    const listingEvents = parseListingEvents(html);
    const filteredEvents = await enrichWithCity(listingEvents);
    return filteredEvents.map(mapListingEvent);
  },
};
