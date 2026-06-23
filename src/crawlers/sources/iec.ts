import {
  decodeHtmlEntities,
  fetchHtml,
  stripHtml,
} from "@/crawlers/fetch-html";
import type { CrawledEvent } from "@/crawlers/types";

const SOURCE_KEY = "iec";
const BASE_URL = "https://iec.bg";
const LISTING_URL = `${BASE_URL}/calendar_all.php`;

type ParsedCalendarEvent = {
  sourceEventId: string;
  title: string;
  description?: string;
  startAt: Date;
  endAt?: Date;
  externalUrl: string;
  organizerName?: string;
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

function parseDateRange(text: string) {
  const match = text.trim().match(/^(\d{2})\.(\d{2})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const startDay = Number(match[1]);
  const startMonth = Number(match[2]);
  const endDay = Number(match[3]);
  const endMonth = Number(match[4]);
  const year = Number(match[5]);

  const startAt = toSofiaUtc(year, startMonth, startDay, 10, 0);
  const endAt = toSofiaUtc(year, endMonth, endDay, 18, 0);

  return {
    startAt,
    endAt:
      endDay !== startDay || endMonth !== startMonth ? endAt : undefined,
  };
}

function resolveAbsoluteUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return new URL(url, BASE_URL).toString();
}

function normalizeExternalUrl(url: string) {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function parseArticle(articleHtml: string): ParsedCalendarEvent | null {
  const dateText = articleHtml.match(/<div class='date'>([^<]+)<\/div>/i)?.[1];
  if (!dateText) return null;

  const dates = parseDateRange(dateText);
  if (!dates) return null;

  const titleLinkMatch = articleHtml.match(
    /<a href='([^']+)' class='calendar-one-title'>([\s\S]*?)<\/a>/i
  );
  if (!titleLinkMatch) return null;

  const externalUrl = normalizeExternalUrl(resolveAbsoluteUrl(titleLinkMatch[1]));
  const linkText = decodeHtmlEntities(stripHtml(titleLinkMatch[2]));

  const calendarInfo = articleHtml.match(
    /<div class='calendar-info'>([\s\S]*?)<\/div>\s*<\/div>\s*<div class='cal-flex'>\s*<div class='organizer-info'>/i
  )?.[1];

  const shortName = calendarInfo
    ? decodeHtmlEntities(
        stripHtml(
          calendarInfo
            .replace(/<div class='date'>[\s\S]*?<\/div>/i, "")
            .replace(/<a[\s\S]*$/i, "")
        )
      )
    : "";

  const title = shortName || linkText;
  if (!title) return null;

  const description =
    shortName && linkText && shortName !== linkText ? linkText : undefined;

  const organizerName = decodeHtmlEntities(
    stripHtml(
      articleHtml.match(/<div class='organizer-info'>([\s\S]*?)<\/div>/i)?.[1] ??
        ""
    )
  );

  const imagePath = articleHtml.match(
    /<figure class='cal-image'>[\s\S]*?<img src='([^']+)'/i
  )?.[1];

  const imageId = imagePath?.match(/\/calendars\/(\d+)-/)?.[1];

  return {
    sourceEventId: imageId ? `iec-${imageId}` : externalUrl,
    title,
    description,
    startAt: dates.startAt,
    endAt: dates.endAt,
    externalUrl,
    organizerName: organizerName || undefined,
    coverImageUrl: imagePath ? resolveAbsoluteUrl(imagePath) : undefined,
  };
}

function parseCalendarEvents(html: string): ParsedCalendarEvent[] {
  const articles = [
    ...html.matchAll(/<article class='calendar-one[^']*'[\s\S]*?<\/article>/gi),
  ];

  const byExternalUrl = new Map<string, ParsedCalendarEvent>();

  for (const match of articles) {
    const parsed = parseArticle(match[0]);
    if (parsed) {
      byExternalUrl.set(parsed.externalUrl, parsed);
    }
  }

  return [...byExternalUrl.values()];
}

function mapCalendarEvent(event: ParsedCalendarEvent): CrawledEvent {
  return {
    sourceKey: SOURCE_KEY,
    sourceEventId: event.sourceEventId,
    title: event.title,
    descriptionHtml: event.description
      ? `<p>${decodeHtmlEntities(event.description)}</p>`
      : undefined,
    startAt: event.startAt,
    endAt: event.endAt,
    city: "sofia",
    locationType: "physical",
    venueName: "Интер Експо Център",
    registrationUrl: event.externalUrl,
    externalUrl: event.externalUrl,
    priceType: "unknown",
    language: "bg",
    organizerName: event.organizerName,
    tags: ["b2b"],
    coverImageUrl: event.coverImageUrl,
  };
}

export const iecCrawler = {
  sourceKey: SOURCE_KEY,
  async crawl(): Promise<CrawledEvent[]> {
    const html = await fetchHtml(LISTING_URL);
    return parseCalendarEvents(html).map(mapCalendarEvent);
  },
};
