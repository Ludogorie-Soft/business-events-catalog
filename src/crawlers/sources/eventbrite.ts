import {
  decodeHtmlEntities,
  extractJsonLdBlocks,
  fetchHtml,
  unescapeJsonString,
} from "@/crawlers/fetch-html";
import type { CrawledEvent } from "@/crawlers/types";

const SOURCE_KEY = "eventbrite";
const LISTING_URL = "https://www.eventbrite.com/d/online/business--events/";

type SchemaEvent = {
  "@type"?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  image?: string;
  offers?: { price?: string | number } | Array<{ price?: string | number }>;
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

function parsePriceType(event: SchemaEvent): CrawledEvent["priceType"] {
  const offers = Array.isArray(event.offers) ? event.offers[0] : event.offers;
  if (!offers?.price && offers?.price !== 0) return "unknown";
  const price = Number(offers.price);
  if (Number.isNaN(price)) return "unknown";
  return price <= 0 ? "free" : "paid";
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
  organizerName?: string;
};

function buildSchemaMetadataMap(schemaEvents: SchemaEvent[]) {
  const map = new Map<string, SchemaMetadata>();

  for (const event of schemaEvents) {
    if (!event.url || !event.startDate) continue;

    const startAt = new Date(event.startDate);
    if (Number.isNaN(startAt.getTime())) continue;

    const endAt = event.endDate ? new Date(event.endDate) : undefined;
    const externalUrl = normalizeEventUrl(event.url);

    map.set(externalUrl, {
      startAt,
      endAt: endAt && !Number.isNaN(endAt.getTime()) ? endAt : undefined,
      description: event.description,
      coverImageUrl: typeof event.image === "string" ? event.image : undefined,
      priceType: parsePriceType(event),
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
    language: "en",
    organizerName: schema.organizerName,
    tags: ["online", "business"],
    coverImageUrl: schema.coverImageUrl,
  };
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

    return [...byUrl.values()];
  },
};
