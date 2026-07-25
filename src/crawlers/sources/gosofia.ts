import {
  decodeHtmlEntities,
  extractJsonLdBlocks,
  fetchHtml,
  stripHtml,
} from "@/crawlers/fetch-html";
import { dedupeCrawledEvents } from "@/crawlers/event-similarity";
import type { CrawledEvent, CrawledLocationType } from "@/crawlers/types";

const SOURCE_KEY = "gosofia";
const BASE_URL = "https://www.go-sofia.com";
const LISTING_PATH = "/Events?category=Business";
const DETAIL_FETCH_CONCURRENCY = 5;
const MAX_PAGES = 20;

const SUBCATEGORY_TOPICS: Record<string, string[]> = {
  Entrepreneurship: ["entrepreneurship"],
  NetworkingEvents: [],
  Technology: ["startups"],
  Leadership: ["leadership"],
  Finance: ["finance"],
  Marketing: ["marketing"],
  HumanResources: ["hr"],
  Startups: ["startups"],
  Sales: ["sales"],
  Investments: ["finance"],
  Innovations: ["startups"],
  ECommerce: ["sales"],
  ProductDevelopment: ["startups"],
};

const SUBCATEGORY_EVENT_TYPES: Record<string, string> = {
  NetworkingEvents: "networking",
  Leadership: "training",
  Entrepreneurship: "meetup",
};

type SchemaPlace = {
  "@type"?: string;
  name?: string;
  address?: {
    addressLocality?: string;
    streetAddress?: string;
  };
};

type SchemaOffer = {
  "@type"?: string;
  url?: string;
  price?: string | number;
  priceCurrency?: string;
};

type SchemaEvent = {
  "@type"?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  image?: string | string[];
  eventAttendanceMode?: string;
  location?: SchemaPlace;
  offers?: SchemaOffer | SchemaOffer[];
};

type ParsedListingEvent = {
  sourceEventId: string;
  title: string;
  startAt: Date;
  externalUrl: string;
  venueName?: string;
  coverImageUrl?: string;
  subcategory?: string;
  tags: string[];
  descriptionSnippet?: string;
};

function listingUrl(page: number) {
  const url = new URL(LISTING_PATH, BASE_URL);
  if (page > 1) url.searchParams.set("page", String(page));
  return url.toString();
}

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

function parseListingDate(text: string) {
  const match = text.match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return null;

  return toSofiaUtc(
    Number(match[3]),
    Number(match[2]),
    Number(match[1]),
    match[4] ? Number(match[4]) : 10,
    match[5] ? Number(match[5]) : 0
  );
}

function normalizeExternalUrl(pathOrUrl: string) {
  const parsed = new URL(pathOrUrl, BASE_URL);
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "");
}

function extractSourceEventId(url: string) {
  return new URL(url).pathname.match(/\/Events\/Details\/(\d+)/i)?.[1] ?? url;
}

function detectLanguage(text: string): CrawledEvent["language"] {
  const hasCyrillic = /[А-Яа-яЁё]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasCyrillic && hasLatin) return "mixed";
  if (hasCyrillic) return "bg";
  return "en";
}

function descriptionToHtml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function parseListingCard(block: string): ParsedListingEvent | null {
  const detailPath = block.match(/href="(\/Events\/Details\/\d+)"/i)?.[1];
  if (!detailPath) return null;

  const title = decodeHtmlEntities(
    stripHtml(block.match(/event-title">([\s\S]*?)<\/h5>/i)?.[1] ?? "")
  );
  const dateText = stripHtml(
    block.match(/event-date[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? ""
  );
  const startAt = parseListingDate(dateText);
  if (!title || !startAt) return null;

  const venueName = decodeHtmlEntities(
    stripHtml(block.match(/event-venue[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "")
  );
  const coverImageUrl = block.match(
    /<img[^>]+src="(https?:\/\/[^"]+)"[^>]*class="event-image-full"/i
  )?.[1];
  const subcategory = block.match(/subCategory=([^"&]+)/i)?.[1];
  const tags = [
    ...block.matchAll(/\/Events\/Tag\/([^"/\s]+)/gi),
  ].map((m) => decodeURIComponent(m[1]));
  const descriptionSnippet = decodeHtmlEntities(
    stripHtml(block.match(/card-text[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "")
  );

  const externalUrl = normalizeExternalUrl(detailPath);

  return {
    sourceEventId: extractSourceEventId(externalUrl),
    title,
    startAt,
    externalUrl,
    venueName: venueName || undefined,
    coverImageUrl,
    subcategory,
    tags,
    descriptionSnippet: descriptionSnippet || undefined,
  };
}

function parseListingEvents(html: string) {
  const blocks = [
    ...html.matchAll(
      /<div class="card event-card h-100">[\s\S]*?(?=<div class="card event-card h-100">|<nav[\s>]|<ul class="pagination"|<\/section>)/gi
    ),
  ];

  const byId = new Map<string, ParsedListingEvent>();
  for (const match of blocks) {
    const parsed = parseListingCard(match[0]);
    if (parsed) byId.set(parsed.sourceEventId, parsed);
  }
  return [...byId.values()];
}

function hasNextPage(html: string, currentPage: number) {
  const nextPage = currentPage + 1;
  return (
    html.includes(`page=${nextPage}`) ||
    html.includes(`page=${nextPage}&`) ||
    new RegExp(`href="[^"]*[?&]page=${nextPage}(?:&|")`, "i").test(html)
  );
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function collectSchemaEvents(blocks: unknown[]): SchemaEvent[] {
  const events: SchemaEvent[] = [];

  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }

    const obj = asObject(node);
    if (!obj) return;

    if (obj["@graph"]) visit(obj["@graph"]);

    const type = obj["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.some((t) => String(t).toLowerCase() === "event")) {
      events.push(obj as SchemaEvent);
    }
  };

  for (const block of blocks) visit(block);
  return events;
}

function parseAttendanceMode(mode?: string): CrawledLocationType {
  const value = mode?.toLowerCase() ?? "";
  if (value.includes("online")) return "online";
  if (value.includes("mixed") || value.includes("hybrid")) return "hybrid";
  return "physical";
}

function firstImage(image?: string | string[]) {
  if (!image) return undefined;
  return Array.isArray(image) ? image[0] : image;
}

function firstOffer(offers?: SchemaOffer | SchemaOffer[]) {
  if (!offers) return undefined;
  return Array.isArray(offers) ? offers[0] : offers;
}

/** Date-only ISO values parse as 00:00 UTC and should not replace listing times. */
function parseDateTime(value: string | undefined): Date | undefined {
  if (!value || !/T\d{2}:\d{2}/.test(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function mapListingEvent(event: ParsedListingEvent): CrawledEvent {
  const topics = event.subcategory
    ? SUBCATEGORY_TOPICS[event.subcategory] ?? []
    : [];
  const eventTypeSlug = event.subcategory
    ? SUBCATEGORY_EVENT_TYPES[event.subcategory]
    : undefined;
  const tags = [
    ...event.tags.map((t) => t.toLowerCase()),
    ...(event.subcategory === "NetworkingEvents" ? ["networking"] : []),
  ];

  return {
    sourceKey: SOURCE_KEY,
    sourceEventId: event.sourceEventId,
    title: event.title,
    descriptionHtml: event.descriptionSnippet
      ? descriptionToHtml(event.descriptionSnippet)
      : undefined,
    startAt: event.startAt,
    city: "sofia",
    locationType: "physical",
    venueName: event.venueName,
    registrationUrl: event.externalUrl,
    externalUrl: event.externalUrl,
    priceType: "unknown",
    language: detectLanguage(
      `${event.title} ${event.descriptionSnippet ?? ""}`
    ),
    tags: [...new Set(tags)],
    topics,
    eventTypeSlug,
    coverImageUrl: event.coverImageUrl,
  };
}

function enrichWithSchema(
  event: CrawledEvent,
  schema: SchemaEvent
): CrawledEvent {
  const offer = firstOffer(schema.offers);
  const description = schema.description?.trim();
  const startAt = parseDateTime(schema.startDate);
  const endAt = parseDateTime(schema.endDate);
  const venueName = schema.location?.name?.trim() || event.venueName;
  const registrationUrl = offer?.url || event.registrationUrl;
  const coverImageUrl = firstImage(schema.image) || event.coverImageUrl;

  let priceType = event.priceType;
  let priceMin = event.priceMin;
  let currency = event.currency;
  if (offer?.price !== undefined && offer.price !== "") {
    const amount = Number(offer.price);
    if (!Number.isNaN(amount)) {
      priceType = amount > 0 ? "paid" : "free";
      priceMin = amount;
      currency = offer.priceCurrency?.toUpperCase();
    }
  } else if (offer?.url) {
    priceType = "paid";
  }

  return {
    ...event,
    title: schema.name?.trim() || event.title,
    descriptionHtml: description
      ? descriptionToHtml(description)
      : event.descriptionHtml,
    startAt: startAt ?? event.startAt,
    endAt: endAt ?? event.endAt,
    locationType: parseAttendanceMode(schema.eventAttendanceMode),
    venueName,
    registrationUrl,
    priceType,
    priceMin,
    currency,
    language: detectLanguage(
      `${schema.name ?? event.title} ${description ?? ""}`
    ),
    coverImageUrl,
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

async function fetchAllListingEvents() {
  const byId = new Map<string, ParsedListingEvent>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await fetchHtml(listingUrl(page));
    const events = parseListingEvents(html);
    if (events.length === 0) break;

    for (const event of events) {
      byId.set(event.sourceEventId, event);
    }

    if (!hasNextPage(html, page)) break;
  }

  return [...byId.values()];
}

async function enrichFromDetailPages(events: CrawledEvent[]) {
  return mapWithConcurrency(events, DETAIL_FETCH_CONCURRENCY, async (event) => {
    try {
      const html = await fetchHtml(event.externalUrl);
      const schema = collectSchemaEvents(extractJsonLdBlocks(html))[0];
      if (!schema) return event;
      return enrichWithSchema(event, schema);
    } catch {
      return event;
    }
  });
}

export const goSofiaCrawler = {
  sourceKey: SOURCE_KEY,
  async crawl(): Promise<CrawledEvent[]> {
    const listingEvents = await fetchAllListingEvents();
    const mapped = listingEvents.map(mapListingEvent);
    const enriched = await enrichFromDetailPages(mapped);
    return dedupeCrawledEvents(enriched);
  },
};
