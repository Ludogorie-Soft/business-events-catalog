import { decodeHtmlEntities, fetchHtml } from "@/crawlers/fetch-html";
import type {
  CrawledEvent,
  CrawledLanguage,
  CrawledLocationType,
  CrawledPriceType,
} from "@/crawlers/types";

const SOURCE_KEY = "devbg";
const ALLOWED_HOSTS = new Set(["dev.bg", "www.dev.bg"]);

function normalizeEventUrl(url: string) {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "");
}

function extractEventSlug(url: string) {
  const match = new URL(url).pathname.match(/^\/event\/([^/]+)\/?$/i);
  return match?.[1];
}

function assertDevBgEventUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error("Невалиден URL адрес.");
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("URL адресът трябва да е от dev.bg.");
  }

  if (!extractEventSlug(parsed.toString())) {
    throw new Error("URL адресът трябва да сочи към страница на събитие (/event/...).");
  }

  return normalizeEventUrl(parsed.toString());
}

function parseBulgarianDateTime(text: string): Date | null {
  const match = text.match(
    /(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:\s*г\.)?(?:\s*от\s+(\d{1,2}):(\d{2}))?/i
  );
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;

  const hours = match[4] ? Number(match[4]) : 12;
  const minutes = match[5] ? Number(match[5]) : 0;

  const isSummer = month >= 4 && month <= 10;
  const offsetHours = isSummer ? 3 : 2;

  return new Date(Date.UTC(year, month - 1, day, hours - offsetHours, minutes));
}

function extractEventDate(html: string) {
  const whenText =
    html.match(/КОГА[^:]*:\s*([^<\n]+)/i)?.[1] ??
    html.match(/Дата[\s\S]{0,120}?(\d{1,2}\.\d{1,2}\.\d{2,4})/i)?.[1];

  if (!whenText) return null;
  return parseBulgarianDateTime(whenText);
}

function parseLanguage(html: string): CrawledLanguage {
  const languageBlock = html.match(/Език[\s\S]{0,120}/i)?.[0] ?? "";
  if (/english/i.test(languageBlock)) return "en";
  if (/български/i.test(languageBlock)) return "bg";
  if (/смесен|mixed/i.test(languageBlock)) return "mixed";
  return "bg";
}

function parseLocationType(html: string): CrawledLocationType {
  if (/Онлайн\s+събитие/i.test(html)) return "online";
  if (/Хибрид/i.test(html)) return "hybrid";
  return "physical";
}

function parsePriceType(html: string): CrawledPriceType {
  if (/безплатно/i.test(html)) return "free";
  if (/платено|вход\s*:\s*\d+/i.test(html)) return "paid";
  return "unknown";
}

function extractTitle(html: string) {
  const title =
    html.match(/property="og:title" content="([^"]+)"/)?.[1] ??
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];

  if (!title) {
    throw new Error("Не бе намерено заглавие на събитието.");
  }

  return decodeHtmlEntities(title.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractDescriptionHtml(html: string) {
  const section = html.match(
    /<h3[^>]*>\s*За събитието\s*<\/h3>\s*([\s\S]*?)(?=<h3[^>]*>|<section[^>]*class="speaker|<div[^>]*class="[^"]*speaker)/i
  )?.[1];

  if (section?.trim()) {
    return section
      .replace(/<\/section>\s*$/i, "")
      .replace(/\s*<\/section>\s*<\/section>\s*$/i, "")
      .trim();
  }

  const ogDescription = html.match(/property="og:description" content="([^"]+)"/)?.[1];
  if (ogDescription) {
    return `<p>${decodeHtmlEntities(ogDescription.trim())}</p>`;
  }

  return undefined;
}

function extractOrganizerName(html: string) {
  const altOrganizer = html.match(/class="organizer-image"[^>]*alt="([^"]+)"/i)?.[1];
  if (altOrganizer?.trim()) {
    return decodeHtmlEntities(altOrganizer.trim());
  }

  const organizerText = html.match(/ОРГАНИЗАТОР[^:]*:\s*([^<\n]+)/i)?.[1];
  if (organizerText?.trim()) {
    return decodeHtmlEntities(organizerText.trim());
  }

  return "DEV.BG";
}

function extractCoverImageUrl(html: string) {
  return html.match(/property="og:image" content="([^"]+)"/)?.[1];
}

export function parseDevBgEventPage(html: string, url: string): CrawledEvent {
  const externalUrl = assertDevBgEventUrl(url);
  const slug = extractEventSlug(externalUrl);
  const startAt = extractEventDate(html);

  if (!startAt || Number.isNaN(startAt.getTime())) {
    throw new Error("Не бе намерена валидна дата на събитието.");
  }

  const locationType = parseLocationType(html);

  return {
    sourceKey: SOURCE_KEY,
    sourceEventId: slug,
    title: extractTitle(html),
    descriptionHtml: extractDescriptionHtml(html),
    startAt,
    city: locationType === "online" ? "online" : "sofia",
    locationType,
    registrationUrl: `${externalUrl}#rsvp`,
    externalUrl,
    priceType: parsePriceType(html),
    language: parseLanguage(html),
    organizerName: extractOrganizerName(html),
    tags: ["startup", "networking"],
    coverImageUrl: extractCoverImageUrl(html),
  };
}

export async function crawlDevBgEventFromUrl(url: string): Promise<CrawledEvent> {
  const externalUrl = assertDevBgEventUrl(url);
  const html = await fetchHtml(externalUrl);
  return parseDevBgEventPage(html, externalUrl);
}

export const devBgManualCrawler = {
  sourceKey: SOURCE_KEY,
  label: "DEV.BG",
  websiteHost: "dev.bg",
  placeholder: "https://dev.bg/event/your-event-slug",
  crawlFromUrl: crawlDevBgEventFromUrl,
};
