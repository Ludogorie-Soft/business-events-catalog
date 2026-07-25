import {
  decodeHtmlEntities,
  extractJsonLdBlocks,
  fetchHtml,
  unescapeJsonString,
} from "@/crawlers/fetch-html";
import type { CrawledEvent } from "@/crawlers/types";

const SOURCE_KEY = "eventbrite";
const LISTING_URL = "https://www.eventbrite.com/d/online/business--events/";
const DETAIL_FETCH_CONCURRENCY = 5;

type SchemaEvent = {
  "@type"?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  image?: string;
  offers?:
    | {
        price?: string | number;
        lowPrice?: string | number;
        highPrice?: string | number;
        priceCurrency?: string;
      }
    | Array<{
        price?: string | number;
        lowPrice?: string | number;
        highPrice?: string | number;
        priceCurrency?: string;
      }>;
  organizer?: { name?: string } | Array<{ name?: string }>;
};

type EmbeddedEvent = {
  name: string;
  language: string;
  url: string;
  summary?: string;
  eid?: string;
};

function normalizeEventUrl(url: string) {
  const parsed = new URL(url);
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function extractEventId(url: string) {
  const match = url.match(/-(\d+)(?:\?|$)/);
  return match?.[1];
}

function isEnglishLanguage(language: string) {
  return language.toLowerCase().startsWith("en");
}

function isAllowedEventUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes("eventbrite.") && !hostname.includes("eventbrite.de");
  } catch {
    return false;
  }
}

type ExtractedPrice = {
  priceType: NonNullable<CrawledEvent["priceType"]>;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
};

function parseOfferAmounts(low?: string | number, high?: string | number) {
  const hasLow = low !== undefined && low !== null && low !== "";
  const hasHigh = high !== undefined && high !== null && high !== "";
  if (!hasLow && !hasHigh) return null;

  const lowAmount = hasLow ? Number(low) : 0;
  const highAmount = hasHigh ? Number(high) : 0;
  if (Number.isNaN(lowAmount) || Number.isNaN(highAmount)) return null;

  return { lowAmount, highAmount };
}

function priceFromOfferRange(
  low?: string | number,
  high?: string | number,
  currency?: string
): ExtractedPrice | null {
  const amounts = parseOfferAmounts(low, high);
  if (!amounts) return null;

  const { lowAmount, highAmount } = amounts;
  // Matches Eventbrite UI: price next to "Get tickets" when any ticket costs money;
  // no displayed price when the range is 0–0 (free registration).
  if (lowAmount > 0 || highAmount > 0) {
    return {
      priceType: "paid",
      priceMin: lowAmount,
      priceMax: highAmount,
      currency: currency?.toUpperCase(),
    };
  }

  return { priceType: "free" };
}

function parsePrice(event: SchemaEvent): ExtractedPrice | null {
  const offers = Array.isArray(event.offers) ? event.offers[0] : event.offers;
  if (!offers) return null;

  const fromRange = priceFromOfferRange(
    offers.lowPrice,
    offers.highPrice,
    offers.priceCurrency
  );
  if (fromRange) return fromRange;

  if (offers.price !== undefined && offers.price !== null && offers.price !== "") {
    const amount = Number(offers.price);
    if (Number.isNaN(amount)) return null;
    if (amount > 0) {
      return {
        priceType: "paid",
        priceMin: amount,
        priceMax: amount,
        currency: offers.priceCurrency?.toUpperCase(),
      };
    }
    return { priceType: "free" };
  }

  return null;
}

/**
 * Prefer AggregateOffer prices from the detail page JSON-LD.
 * Do not use `"isFree"` — Eventbrite often sets it to false even for free events.
 */
function extractDetailPrice(html: string): ExtractedPrice | null {
  const schemaEvents = collectSchemaEvents(extractJsonLdBlocks(html));
  for (const event of schemaEvents) {
    const price = parsePrice(event);
    if (price) return price;
  }

  // Fallback if JSON-LD parsing missed the AggregateOffer block.
  const aggregate = html.match(
    /"@type"\s*:\s*"AggregateOffer"[^}]*"lowPrice"\s*:\s*"([^"]+)"\s*,\s*"highPrice"\s*:\s*"([^"]+)"[^}]*"priceCurrency"\s*:\s*"([^"]+)"/
  );
  if (aggregate) {
    return priceFromOfferRange(aggregate[1], aggregate[2], aggregate[3]);
  }

  const aggregateNoCurrency = html.match(
    /"@type"\s*:\s*"AggregateOffer"[^}]*"lowPrice"\s*:\s*"([^"]+)"\s*,\s*"highPrice"\s*:\s*"([^"]+)"/
  );
  if (aggregateNoCurrency) {
    const currency = html.match(/"currency"\s*:\s*"([A-Z]{3})"/)?.[1];
    return priceFromOfferRange(
      aggregateNoCurrency[1],
      aggregateNoCurrency[2],
      currency
    );
  }

  return null;
}

function parseOrganizer(event: SchemaEvent) {
  const organizer = Array.isArray(event.organizer)
    ? event.organizer[0]
    : event.organizer;
  return organizer?.name?.trim() || undefined;
}

function collectSchemaEvents(blocks: unknown[]): SchemaEvent[] {
  const events: SchemaEvent[] = [];

  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;

    const record = block as Record<string, unknown>;

    if (record["@type"] === "Event") {
      events.push(record as SchemaEvent);
    }

    const list = record.itemListElement;
    if (Array.isArray(list)) {
      for (const item of list) {
        const event = (item as { item?: SchemaEvent })?.item;
        if (event?.["@type"] === "Event") {
          events.push(event);
        }
      }
    }
  }

  return events;
}

type SchemaMetadata = {
  startAt: Date;
  endAt?: Date;
  description?: string;
  coverImageUrl?: string;
  priceType?: CrawledEvent["priceType"];
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  organizerName?: string;
};

/** Listing JSON-LD is date-only (YYYY-MM-DD); detail pages include a time. */
function hasDateTime(value: string | undefined): value is string {
  return Boolean(value && /T\d{2}:\d{2}/.test(value));
}

function parseDateTime(value: string | undefined): Date | undefined {
  if (!hasDateTime(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Detail pages expose real times via JSON-LD ISO offsets or embedded utc fields.
 * Listing pages only have date-only startDate values that parse as 00:00 UTC.
 */
function extractDetailTimes(html: string): { startAt: Date; endAt?: Date } | null {
  const schemaEvents = collectSchemaEvents(extractJsonLdBlocks(html));
  for (const event of schemaEvents) {
    const startAt = parseDateTime(event.startDate);
    if (!startAt) continue;
    return {
      startAt,
      endAt: parseDateTime(event.endDate),
    };
  }

  const startUtc = html.match(
    /"startDate":\{"timezone":"[^"]+","local":"[^"]+","utc":"([^"]+)"\}/
  )?.[1];
  const endUtc = html.match(
    /"endDate":\{"timezone":"[^"]+","local":"[^"]+","utc":"([^"]+)"\}/
  )?.[1];

  const startAt = parseDateTime(startUtc);
  if (!startAt) return null;

  return {
    startAt,
    endAt: parseDateTime(endUtc),
  };
}

function buildSchemaMetadataMap(schemaEvents: SchemaEvent[]) {
  const map = new Map<string, SchemaMetadata>();

  for (const event of schemaEvents) {
    if (!event.url || !event.startDate) continue;

    // Prefer timed values when present; date-only is a temporary placeholder
    // until the detail page is fetched.
    const startAt = new Date(event.startDate);
    if (Number.isNaN(startAt.getTime())) continue;

    const endAt = event.endDate ? new Date(event.endDate) : undefined;
    const externalUrl = normalizeEventUrl(event.url);

    const price = parsePrice(event);

    map.set(externalUrl, {
      startAt,
      endAt: endAt && !Number.isNaN(endAt.getTime()) ? endAt : undefined,
      description: event.description,
      coverImageUrl: typeof event.image === "string" ? event.image : undefined,
      priceType: price?.priceType ?? "unknown",
      priceMin: price?.priceMin,
      priceMax: price?.priceMax,
      currency: price?.currency,
      organizerName: parseOrganizer(event),
    });
  }

  return map;
}

function parseEmbeddedEvents(html: string): EmbeddedEvent[] {
  const events: EmbeddedEvent[] = [];
  const pattern =
    /"name":"((?:\\.|[^"\\])*)","language":"([^"]+)","url":"((?:\\.|[^"\\])*)","hide_start_date":(?:true|false),"summary":"((?:\\.|[^"\\])*)"/g;

  for (const match of html.matchAll(pattern)) {
    events.push({
      name: unescapeJsonString(match[1]),
      language: match[2],
      url: unescapeJsonString(match[3]),
      summary: unescapeJsonString(match[4]),
      eid: extractEventId(unescapeJsonString(match[3])),
    });
  }

  const byUrl = new Map<string, EmbeddedEvent>();
  for (const event of events) {
    byUrl.set(normalizeEventUrl(event.url), event);
  }

  return [...byUrl.values()];
}

function mapEmbeddedEvent(
  event: EmbeddedEvent,
  schema: SchemaMetadata | undefined
): CrawledEvent | null {
  if (!isEnglishLanguage(event.language) || !isAllowedEventUrl(event.url)) {
    return null;
  }

  if (!schema) return null;

  const externalUrl = normalizeEventUrl(event.url);
  const description = event.summary || schema.description;

  return {
    sourceKey: SOURCE_KEY,
    sourceEventId: event.eid ?? extractEventId(externalUrl),
    title: decodeHtmlEntities(event.name.trim()),
    descriptionHtml: description
      ? `<p>${decodeHtmlEntities(description.trim())}</p>`
      : undefined,
    startAt: schema.startAt,
    endAt: schema.endAt,
    city: "online",
    locationType: "online",
    registrationUrl: externalUrl,
    externalUrl,
    priceType: schema.priceType ?? "unknown",
    priceMin: schema.priceMin,
    priceMax: schema.priceMax,
    currency: schema.currency,
    language: "en",
    organizerName: schema.organizerName,
    tags: ["online", "business"],
    coverImageUrl: schema.coverImageUrl,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

async function enrichFromDetailPages(events: CrawledEvent[]): Promise<CrawledEvent[]> {
  return mapWithConcurrency(events, DETAIL_FETCH_CONCURRENCY, async (event) => {
    try {
      const html = await fetchHtml(event.externalUrl);
      const times = extractDetailTimes(html);
      const price = extractDetailPrice(html);
      return {
        ...event,
        ...(times
          ? { startAt: times.startAt, endAt: times.endAt }
          : {}),
        ...(price
          ? {
              priceType: price.priceType,
              priceMin: price.priceMin,
              priceMax: price.priceMax,
              currency: price.currency,
            }
          : {}),
      };
    } catch {
      // Keep listing metadata if the detail page cannot be fetched.
      return event;
    }
  });
}

export const eventbriteCrawler = {
  sourceKey: SOURCE_KEY,
  async crawl(): Promise<CrawledEvent[]> {
    const html = await fetchHtml(LISTING_URL);
    const embeddedEvents = parseEmbeddedEvents(html);
    const schemaEvents = collectSchemaEvents(extractJsonLdBlocks(html));
    const schemaMetadata = buildSchemaMetadataMap(schemaEvents);
    const byUrl = new Map<string, CrawledEvent>();

    for (const embeddedEvent of embeddedEvents) {
      const mapped = mapEmbeddedEvent(
        embeddedEvent,
        schemaMetadata.get(normalizeEventUrl(embeddedEvent.url))
      );
      if (mapped) {
        byUrl.set(mapped.externalUrl, mapped);
      }
    }

    return enrichFromDetailPages([...byUrl.values()]);
  },
};
