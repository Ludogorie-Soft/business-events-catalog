import {
  decodeHtmlEntities,
  fetchHtml,
  stripHtml,
} from "@/crawlers/fetch-html";
import type { CrawledEvent } from "@/crawlers/types";

const SOURCE_KEY = "startupcouncil";
const BASE_URL = "https://www.startupcouncil.org";
const LISTING_URL = `${BASE_URL}/events`;

type ParsedListingEvent = {
  path: string;
  title: string;
  startAt: Date;
  priceType: CrawledEvent["priceType"];
  description?: string;
  organizerName?: string;
};

function parseUsDate(dateText: string, timeText?: string) {
  const [month, day, year] = dateText.split("/").map(Number);
  if (!month || !day || !year) return null;

  let hours = 12;
  let minutes = 0;

  if (timeText) {
    const match = timeText.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      hours = Number(match[1]) % 12;
      minutes = Number(match[2]);
      if (match[3].toUpperCase() === "PM") hours += 12;
    }
  }

  // Startup Council lists US event times; store as UTC until per-source timezone is added.
  return new Date(Date.UTC(year, month - 1, day, hours, minutes));
}

function parseEventBlock(block: string, path: string): ParsedListingEvent | null {
  const title =
    block.match(/title="([^"]+)"[^>]*href="\/events\//)?.[1] ??
    block.match(/<a class="h3 bold bmargin center-block"[^>]*>\s*([^<]+?)\s*<\/a>/)?.[1];

  const dateText = block.match(/<b>(\d{2}\/\d{2}\/\d{4})<\/b>\s*([\d:]+\s*[AP]M)?/i);
  if (!title || !dateText) return null;

  const startAt = parseUsDate(dateText[1], dateText[2]);
  if (!startAt || Number.isNaN(startAt.getTime())) return null;

  const priceLabel =
    block.match(
      /<div class="btn-sm bg-primary font-lg bold no-radius-bottom">\s*(Free|\$[\d.,]+)/i
    )?.[1] ?? "unknown";

  const description = block.match(
    /<p class="bpad xs-nomargin xs-nopad">\s*([\s\S]*?)<\/p>/
  )?.[1];

  const organizerName =
    [...block.matchAll(/<p[^>]*>\s*<b>([^<]+)<\/b>\s*<\/p>/gi)]
      .map((match) => match[1].trim())
      .find((name) => name.toLowerCase() !== "free") ??
    "Startup Council";

  return {
    path,
    title: decodeHtmlEntities(stripHtml(title)),
    startAt,
    priceType: /free/i.test(priceLabel)
      ? "free"
      : priceLabel.startsWith("$")
        ? "paid"
        : "unknown",
    description: description ? stripHtml(description) : undefined,
    organizerName: decodeHtmlEntities(organizerName),
  };
}

function parseListingEvents(html: string): ParsedListingEvent[] {
  const paths = [
    ...new Set(
      [...html.matchAll(/href="(\/events\/[^"]+)"/g)].map((match) => match[1])
    ),
  ];

  const events: ParsedListingEvent[] = [];

  for (const path of paths) {
    const marker = `href="${path}"`;
    const index = html.indexOf(marker);
    if (index === -1) continue;

    const block = html.slice(Math.max(0, index - 1200), index + 2200);
    const parsed = parseEventBlock(block, path);
    if (parsed) {
      events.push(parsed);
    }
  }

  const byPath = new Map<string, ParsedListingEvent>();
  for (const event of events) {
    byPath.set(event.path, event);
  }

  return [...byPath.values()];
}

function mapListingEvent(event: ParsedListingEvent): CrawledEvent {
  const externalUrl = `${BASE_URL}${event.path}`;

  return {
    sourceKey: SOURCE_KEY,
    sourceEventId: event.path.replace(/^\/events\//, ""),
    title: event.title,
    descriptionHtml: event.description
      ? `<p>${decodeHtmlEntities(event.description)}</p>`
      : undefined,
    startAt: event.startAt,
    city: "online",
    locationType: "online",
    registrationUrl: externalUrl,
    externalUrl,
    priceType: event.priceType,
    language: "en",
    organizerName: event.organizerName,
    tags: ["startup", "online", "business"],
  };
}

export const startupCouncilCrawler = {
  sourceKey: SOURCE_KEY,
  async crawl(): Promise<CrawledEvent[]> {
    const html = await fetchHtml(LISTING_URL);
    return parseListingEvents(html).map(mapListingEvent);
  },
};
