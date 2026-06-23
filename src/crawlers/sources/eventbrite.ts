import { decodeHtmlEntities, extractJsonLdBlocks, fetchHtml } from "@/crawlers/fetch-html";
import type { CrawledEvent } from "@/crawlers/types";

const SOURCE_KEY = "eventbrite";
const LISTING_URL = "https://www.eventbrite.com/d/online/all-events/";

type SchemaEvent = {
  "@type"?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  image?: string;
  eventAttendanceMode?: string;
  location?: { "@type"?: string; url?: string };
  offers?: { price?: string | number; priceCurrency?: string } | Array<{ price?: string | number }>;
  organizer?: { name?: string } | Array<{ name?: string }>;
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

    const graph = record["@graph"];
    if (Array.isArray(graph)) {
      for (const node of graph) {
        if ((node as SchemaEvent)?.["@type"] === "Event") {
          events.push(node as SchemaEvent);
        }
      }
    }
  }

  return events;
}

function mapSchemaEvent(event: SchemaEvent): CrawledEvent | null {
  if (!event.name || !event.startDate || !event.url) return null;

  const externalUrl = normalizeEventUrl(event.url);
  const startAt = new Date(event.startDate);
  if (Number.isNaN(startAt.getTime())) return null;

  const endAt = event.endDate ? new Date(event.endDate) : undefined;

  return {
    sourceKey: SOURCE_KEY,
    sourceEventId: extractEventId(externalUrl),
    title: decodeHtmlEntities(event.name.trim()),
    descriptionHtml: event.description
      ? `<p>${decodeHtmlEntities(event.description.trim())}</p>`
      : undefined,
    startAt,
    endAt: endAt && !Number.isNaN(endAt.getTime()) ? endAt : undefined,
    city: "online",
    locationType: "online",
    registrationUrl: externalUrl,
    externalUrl,
    priceType: parsePriceType(event),
    language: "en",
    organizerName: parseOrganizer(event),
    tags: ["online", "business"],
    coverImageUrl: typeof event.image === "string" ? event.image : undefined,
  };
}

export const eventbriteCrawler = {
  sourceKey: SOURCE_KEY,
  async crawl(): Promise<CrawledEvent[]> {
    const html = await fetchHtml(LISTING_URL);
    const schemaEvents = collectSchemaEvents(extractJsonLdBlocks(html));
    const byUrl = new Map<string, CrawledEvent>();

    for (const schemaEvent of schemaEvents) {
      const mapped = mapSchemaEvent(schemaEvent);
      if (mapped) {
        byUrl.set(mapped.externalUrl, mapped);
      }
    }

    return [...byUrl.values()];
  },
};
