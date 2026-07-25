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
  endAt?: Date;
  externalUrl: string;
  coverImageUrl?: string;
  venueName?: string;
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

function parseEventDate(text: string, hours = 19, minutes = 0) {
  const match = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;

  return toSofiaUtc(
    Number(match[3]),
    Number(match[2]),
    Number(match[1]),
    hours,
    minutes
  );
}

function parseTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
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

function extractDetailListTexts(html: string) {
  return [
    ...html.matchAll(
      /class="elementor-icon-list-text"[^>]*>([\s\S]*?)<\/span>/gi
    ),
  ]
    .map((match) => decodeHtmlEntities(stripHtml(match[1])))
    .filter(Boolean);
}

function extractVenueFromDetail(html: string) {
  const texts = extractDetailListTexts(html);
  const venueLine = texts.find(
    (text) =>
      !/^\d{2}\.\d{2}\.\d{4}/.test(text) &&
      !/^\d{1,2}:\d{2}/.test(text) &&
      !/€|лв|bgn|вход|entrance|ticket/i.test(text) &&
      !/\+?\d[\d\s-]{6,}/.test(text) &&
      !/организатор|organizer|представя|business presentation/i.test(text)
  );
  if (!venueLine) return undefined;

  // "ROCK'N'ROLLA (ул. Граф Игнатиев 1, София)" → venue name before address.
  return venueLine.replace(/\s*\(.*\)\s*$/, "").trim() || venueLine;
}

function extractTimesFromDetail(
  html: string,
  fallbackDate: Date
): { startAt: Date; endAt?: Date } {
  const texts = extractDetailListTexts(html);
  const timeLine = texts.find((text) =>
    /\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(text)
  );
  if (!timeLine) return { startAt: fallbackDate };

  const match = timeLine.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!match) return { startAt: fallbackDate };

  const startTime = parseTime(match[1]);
  const endTime = parseTime(match[2]);
  if (!startTime) return { startAt: fallbackDate };

  const year = fallbackDate.getUTCFullYear();
  // Reconstruct Sofia local day from the already-correct fallback date.
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fallbackDate);
  const [y, m, d] = dayKey.split("-").map(Number);

  const startAt = toSofiaUtc(y, m, d, startTime.hours, startTime.minutes);
  const endAt = endTime
    ? toSofiaUtc(y, m, d, endTime.hours, endTime.minutes)
    : undefined;

  // Keep year sanity if Intl somehow drifts (shouldn't).
  if (Number.isNaN(startAt.getTime()) || startAt.getUTCFullYear() < year - 1) {
    return { startAt: fallbackDate };
  }

  return { startAt, endAt };
}

async function enrichEventDetails(
  event: ParsedListingEvent
): Promise<Omit<EnrichedListingEvent, "citySlug"> & { citySlug: string | null }> {
  let citySlug =
    (hasExplicitCityTag(event.title)
      ? extractCityFromTitle(event.title)
      : null) ?? extractCityFromUrl(event.externalUrl);

  let venueName = event.venueName;
  let startAt = event.startAt;
  let endAt = event.endAt;

  try {
    const html = await fetchHtml(event.externalUrl);
    if (!citySlug) {
      citySlug = extractCityFromHtml(html);
    }
    venueName = extractVenueFromDetail(html) ?? venueName;
    const times = extractTimesFromDetail(html, startAt);
    startAt = times.startAt;
    endAt = times.endAt ?? endAt;
  } catch {
    // Keep listing metadata if the detail page cannot be fetched.
  }

  return { ...event, citySlug, venueName, startAt, endAt };
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

async function enrichListingEvents(
  events: ParsedListingEvent[]
): Promise<EnrichedListingEvent[]> {
  const enriched: EnrichedListingEvent[] = [];

  for (const event of events) {
    const details = await enrichEventDetails(event);
    if (!details.citySlug || !ALLOWED_CITY_SLUGS.has(details.citySlug)) {
      continue;
    }

    enriched.push({
      ...details,
      citySlug: details.citySlug,
    });
  }

  return enriched;
}

function mapListingEvent(event: EnrichedListingEvent): CrawledEvent {
  return {
    sourceKey: SOURCE_KEY,
    sourceEventId: event.sourceEventId,
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    city: event.citySlug,
    locationType: "physical",
    venueName: event.venueName,
    registrationUrl: event.externalUrl,
    externalUrl: event.externalUrl,
    priceType: "paid",
    language: "mixed",
    organizerName: ORGANIZER_NAME,
    tags: ["startup", "networking"],
    eventTypeSlug: "networking",
    coverImageUrl: event.coverImageUrl,
  };
}

export const enoCrawler = {
  sourceKey: SOURCE_KEY,
  async crawl(): Promise<CrawledEvent[]> {
    const html = await fetchHtml(LISTING_URL);
    const listingEvents = parseListingEvents(html);
    const filteredEvents = await enrichListingEvents(listingEvents);
    return filteredEvents.map(mapListingEvent);
  },
};
