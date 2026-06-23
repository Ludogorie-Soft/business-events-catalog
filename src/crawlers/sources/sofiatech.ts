import {
  decodeHtmlEntities,
  fetchHtml,
  stripHtml,
} from "@/crawlers/fetch-html";
import type { CrawledEvent } from "@/crawlers/types";

const SOURCE_KEY = "sofiatech";
const BASE_URL = "https://sofiatech.bg";
const LISTING_URL = `${BASE_URL}/upcoming-events/`;
const ORGANIZER_NAME = "Sofia Tech Park";
const VENUE_NAME = "Sofia Tech Park";

const BG_MONTHS: Record<string, number> = {
  януари: 1,
  "ян.": 1,
  ян: 1,
  февруари: 2,
  "фев.": 2,
  фев: 2,
  март: 3,
  "мар.": 3,
  мар: 3,
  април: 4,
  "апр.": 4,
  апр: 4,
  май: 5,
  юни: 6,
  юли: 7,
  август: 8,
  "авг.": 8,
  авг: 8,
  септември: 9,
  "сеп.": 9,
  сеп: 9,
  октомври: 10,
  "окт.": 10,
  окт: 10,
  ноември: 11,
  "ноем.": 11,
  ноем: 11,
  декември: 12,
  "дек.": 12,
  дек: 12,
};

type ParsedListingEvent = {
  sourceEventId: string;
  title: string;
  startAt: Date;
  endAt?: Date;
  externalUrl: string;
  coverImageUrl?: string;
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

function normalizeDateText(text: string) {
  return decodeHtmlEntities(text).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function parseTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function parseBulgarianDateToken(text: string) {
  const normalized = normalizeDateText(text).toLowerCase();
  const match = normalized.match(/^(\d{1,2})\s+([а-я.]+)\s+(\d{4})(?:\s+(\d{1,2}:\d{2}))?/);
  if (!match) return null;

  const month = BG_MONTHS[match[2].trim()];
  if (!month) return null;

  const time = match[4] ? parseTime(match[4]) : null;

  return {
    day: Number(match[1]),
    month,
    year: Number(match[3]),
    hours: time?.hours ?? 10,
    minutes: time?.minutes ?? 0,
  };
}

function tokenToDate(
  token: ReturnType<typeof parseBulgarianDateToken>,
  fallbackHours = 10,
  fallbackMinutes = 0
) {
  if (!token) return null;
  return toSofiaUtc(
    token.year,
    token.month,
    token.day,
    token.hours ?? fallbackHours,
    token.minutes ?? fallbackMinutes
  );
}

function parseEventDateRange(text: string) {
  const normalized = normalizeDateText(text);

  const crossDayRange = normalized.match(/^(.+?\d{4})\s*-\s*(.+?\d{4})$/);
  if (crossDayRange) {
    const startToken = parseBulgarianDateToken(crossDayRange[1]);
    const endToken = parseBulgarianDateToken(crossDayRange[2]);
    const startAt = tokenToDate(startToken);
    const endAt = tokenToDate(endToken, 18, 0);
    if (!startAt || !endAt) return null;
    return { startAt, endAt };
  }

  const sameDayTimeRange = normalized.match(
    /^(\d{1,2}\s+[А-Яа-я.]+\s+\d{4})\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/i
  );
  if (sameDayTimeRange) {
    const dateToken = parseBulgarianDateToken(sameDayTimeRange[1]);
    const startTime = parseTime(sameDayTimeRange[2]);
    const endTime = parseTime(sameDayTimeRange[3]);
    if (!dateToken || !startTime || !endTime) return null;

    const startAt = toSofiaUtc(
      dateToken.year,
      dateToken.month,
      dateToken.day,
      startTime.hours,
      startTime.minutes
    );
    const endAt = toSofiaUtc(
      dateToken.year,
      dateToken.month,
      dateToken.day,
      endTime.hours,
      endTime.minutes
    );
    return { startAt, endAt };
  }

  const singleDate = parseBulgarianDateToken(normalized);
  const startAt = tokenToDate(singleDate);
  if (!startAt) return null;
  return { startAt };
}

function extractUpcomingSection(html: string) {
  const start = html.search(/<h2[^>]*>\s*Предстоящи събития\s*<\/h2>/i);
  const end = html.search(/<h2[^>]*>\s*Проведени събития\s*<\/h2>/i);
  if (start === -1 || end === -1 || end <= start) {
    return html;
  }
  return html.slice(start, end);
}

function normalizeExternalUrl(url: string) {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "");
}

function extractSourceEventId(url: string) {
  const slug = new URL(url).pathname.match(/\/events\/([^/]+)\/?$/i)?.[1];
  return slug ?? url;
}

function parseGridItem(block: string): ParsedListingEvent | null {
  const title = decodeHtmlEntities(
    stripHtml(block.match(/ue_p_title">([\s\S]*?)<\/div>/i)?.[1] ?? "")
  );
  const rawUrl = block.match(/href='([^']+)'/i)?.[1];
  const dateText = stripHtml(
    block.match(/ue-grid-start-end-date">([\s\S]*?)<\/div>/i)?.[1] ?? ""
  );

  if (!title || !rawUrl || !dateText) return null;

  const dates = parseEventDateRange(dateText);
  if (!dates) return null;

  const externalUrl = normalizeExternalUrl(rawUrl);
  const coverImageUrl = block.match(
    /src="(https:\/\/sofiatech\.bg\/wp-content\/uploads[^"]+)"/i
  )?.[1];

  return {
    sourceEventId: extractSourceEventId(externalUrl),
    title,
    startAt: dates.startAt,
    endAt: dates.endAt,
    externalUrl,
    coverImageUrl,
  };
}

function parseListingEvents(html: string) {
  const section = extractUpcomingSection(html);
  const blocks = [
    ...section.matchAll(
      /<div id="uc_event_grid_elementor_[^"]+" class="uc_post_grid_style_one_item[\s\S]*?(?=<div id="uc_event_grid_elementor_|$)/g
    ),
  ];

  const byUrl = new Map<string, ParsedListingEvent>();

  for (const match of blocks) {
    const parsed = parseGridItem(match[0]);
    if (parsed) {
      byUrl.set(parsed.externalUrl, parsed);
    }
  }

  return [...byUrl.values()];
}

function mapListingEvent(event: ParsedListingEvent): CrawledEvent {
  return {
    sourceKey: SOURCE_KEY,
    sourceEventId: event.sourceEventId,
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    city: "sofia",
    locationType: "physical",
    venueName: VENUE_NAME,
    registrationUrl: event.externalUrl,
    externalUrl: event.externalUrl,
    priceType: "unknown",
    language: "mixed",
    organizerName: ORGANIZER_NAME,
    tags: ["startup", "networking"],
    coverImageUrl: event.coverImageUrl,
  };
}

export const sofiaTechCrawler = {
  sourceKey: SOURCE_KEY,
  async crawl(): Promise<CrawledEvent[]> {
    const html = await fetchHtml(LISTING_URL);
    return parseListingEvents(html).map(mapListingEvent);
  },
};
