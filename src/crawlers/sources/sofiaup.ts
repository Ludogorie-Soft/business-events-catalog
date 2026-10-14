import { decodeHtmlEntities, fetchHtml } from "@/crawlers/fetch-html";
import type { CrawledEvent } from "@/crawlers/types";

const SOURCE_KEY = "sofiaup";
const BASE_URL = "https://www.sofia.bg";
const LISTING_URL = `${BASE_URL}/bg/sofia-up`;
const ORGANIZER_NAME = "Столична община";
const DEFAULT_VENUE_NAME = "Сцена „Централни хали“";
const DEFAULT_TITLE = "Sofia Up – срещи за предприемачи";
// Every edition so far started at 12:30; used when the page omits the time.
const DEFAULT_START = { hours: 12, minutes: 30 };

const BG_MONTHS: Record<string, number> = {
  януари: 1,
  февруари: 2,
  март: 3,
  април: 4,
  май: 5,
  юни: 6,
  юли: 7,
  август: 8,
  септември: 9,
  октомври: 10,
  ноември: 11,
  декември: 12,
};

type ListingEntry = {
  sourceEventId: string;
  externalUrl: string;
  year?: number;
  month?: number;
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

function htmlToText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<(?:br|\/p|\/li|\/h\d|\/div)\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[​-‍﻿]/g, "")
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function descriptionToHtml(text: string) {
  return text
    .split("\n")
    .map(
      (line) =>
        `<p>${line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</p>`
    )
    .join("");
}

/** Month headings ("м. октомври 2026 година") are each followed by a link to that edition. */
function parseListing(html: string): ListingEntry[] {
  const entries = new Map<string, ListingEntry>();
  const pattern =
    /м\.\s*([а-я]+)\s+(\d{4})\s+година[\s\S]*?href="(\/w\/(\d+))"|href="(\/w\/(\d+))"/gi;

  for (const match of html.matchAll(pattern)) {
    const path = match[3] ?? match[5];
    const id = match[4] ?? match[6];
    if (entries.has(id)) continue;

    const month = match[1] ? BG_MONTHS[match[1].toLowerCase()] : undefined;
    entries.set(id, {
      sourceEventId: id,
      externalUrl: new URL(path, BASE_URL).toString(),
      year: month ? Number(match[2]) : undefined,
      month,
    });
  }

  return [...entries.values()];
}

function isCurrentOrFutureMonth(entry: ListingEntry, now = new Date()) {
  if (!entry.year || !entry.month) return false;
  const sofiaNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Sofia" })
  );
  return (
    entry.year * 12 + entry.month >=
    sofiaNow.getFullYear() * 12 + sofiaNow.getMonth() + 1
  );
}

function extractOgTitle(html: string) {
  const value = html.match(
    /<meta property="og:title" content="([^"]*)"/i
  )?.[1];
  return value ? decodeHtmlEntities(value).trim() : undefined;
}

/** The article body is the longest rich-text fragment on the page. */
function extractBodyHtml(html: string) {
  const blocks = [
    ...html.matchAll(
      /data-lfr-editable-type="rich-text">([\s\S]*?)<\/div><\/div><style/gi
    ),
  ].map((m) => m[1]);
  return blocks.sort((a, b) => b.length - a.length)[0] ?? "";
}

/** Pages keep a recap of the previous edition below the announcement; drop it. */
function announcementOnly(text: string) {
  const cut = text.search(
    /За повече информация|Sofia Up представя множество|Sofia Up свързва/i
  );
  return cut > 0 ? text.slice(0, cut).trim() : text;
}

function parseDate(text: string) {
  const match = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return null;
  return { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
}

function parseTimes(text: string) {
  const range = text.match(
    /(\d{1,2})[:.](\d{2})\s*(?:ч\.?|часа)?\s*(?:[–—-]|до)\s*(\d{1,2})[:.](\d{2})/
  );
  if (range) {
    return {
      start: { hours: Number(range[1]), minutes: Number(range[2]) },
      end: { hours: Number(range[3]), minutes: Number(range[4]) },
    };
  }

  const single =
    text.match(/(?:Час:|от)\s*(\d{1,2})[:.](\d{2})/i) ??
    text.match(/(\d{1,2}):(\d{2})\s*ч/);
  if (single) {
    return { start: { hours: Number(single[1]), minutes: Number(single[2]) } };
  }

  return { start: DEFAULT_START };
}

function parseVenue(text: string) {
  const location = text.match(/Локация:\s*([^\n]+)/i)?.[1]?.trim();
  if (location && !/Централни\s+хали/i.test(location)) return location;
  if (location || /Централни\s+хали/i.test(text)) return DEFAULT_VENUE_NAME;
  return undefined;
}

function parseTheme(text: string) {
  const theme = text.match(
    /тема(?:та)?[^„“”"]{0,40}[„“”"]([^„“”"\n]{8,160})[“”"]/i
  )?.[1];
  return theme?.trim();
}

function parseRegistrationUrl(bodyHtml: string) {
  return bodyHtml.match(
    /href="(https:\/\/(?:forms\.gle|docs\.google\.com\/forms)\/[^"]+)"/i
  )?.[1];
}

function parseCoverImage(bodyHtml: string) {
  const src = bodyHtml.match(/<img[^>]+src="([^"]+)"/i)?.[1];
  return src ? new URL(decodeHtmlEntities(src), BASE_URL).toString() : undefined;
}

function parseEventPage(
  html: string,
  entry: ListingEntry
): CrawledEvent | null {
  const ogTitle = extractOgTitle(html) ?? "";
  const bodyHtml = extractBodyHtml(html);
  const text = announcementOnly(htmlToText(bodyHtml));

  const date = parseDate(ogTitle) ?? parseDate(text);
  if (!date) return null;

  const { start, end } = parseTimes(text);
  const startAt = toSofiaUtc(
    date.year,
    date.month,
    date.day,
    start.hours,
    start.minutes
  );
  const endAt = end
    ? toSofiaUtc(date.year, date.month, date.day, end.hours, end.minutes)
    : undefined;

  const theme = parseTheme(text);

  return {
    sourceKey: SOURCE_KEY,
    sourceEventId: entry.sourceEventId,
    title: theme ? `Sofia Up: ${theme}` : DEFAULT_TITLE,
    descriptionHtml: text ? descriptionToHtml(text) : undefined,
    startAt,
    endAt: endAt && endAt > startAt ? endAt : undefined,
    city: "sofia",
    locationType: "physical",
    venueName: parseVenue(text),
    registrationUrl: parseRegistrationUrl(bodyHtml) ?? entry.externalUrl,
    externalUrl: entry.externalUrl,
    priceType: "free",
    language: "bg",
    organizerName: ORGANIZER_NAME,
    tags: ["networking", "startup"],
    topics: ["entrepreneurship"],
    eventTypeSlug: "meetup",
    coverImageUrl: parseCoverImage(bodyHtml),
  };
}

export const sofiaUpCrawler = {
  sourceKey: SOURCE_KEY,
  async crawl(): Promise<CrawledEvent[]> {
    const listingHtml = await fetchHtml(LISTING_URL);
    const entries = parseListing(listingHtml);
    const upcoming = entries.filter((entry) => isCurrentOrFutureMonth(entry));
    // Fall back to the newest edition if month headings can't be parsed.
    const toFetch = upcoming.length > 0 ? upcoming : entries.slice(0, 1);

    const events: CrawledEvent[] = [];
    for (const entry of toFetch) {
      try {
        const html = await fetchHtml(entry.externalUrl);
        const event = parseEventPage(html, entry);
        if (event) events.push(event);
      } catch {
        // Skip editions whose page fails to load.
      }
    }
    return events;
  },
};
