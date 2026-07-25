import type { CrawledEvent } from "@/crawlers/types";

/**
 * Known bilingual / alternate titles for the same recurring events.
 * First entry in each group is the canonical form used for comparison.
 */
const TITLE_ALIAS_GROUPS: string[][] = [
  [
    "entrepreneurs night out",
    "нощта на предприемачите",
    "night of entrepreneurs",
  ],
];

export function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/^\[[^\]]+\]\s*/u, "")
    .replace(/\|\s*\d{1,2}\.\d{1,2}\.\d{4}.*$/u, "")
    .replace(/^(купи билети за|buy tickets for)\s+/iu, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function applyTitleAliases(normalized: string) {
  for (const group of TITLE_ALIAS_GROUPS) {
    if (group.some((alias) => normalized.includes(alias))) {
      // Keep distinctive suffixes (e.g. "garden social party v2") after the alias.
      const matched = group.find((alias) => normalized.includes(alias));
      if (!matched) continue;
      const suffix = normalized.replace(matched, " ").replace(/\s+/g, " ").trim();
      return suffix ? `${group[0]} ${suffix}` : group[0];
    }
  }
  return normalized;
}

export function canonicalTitle(title: string) {
  return applyTitleAliases(normalizeTitle(title));
}

export function titlesMatch(a: string, b: string) {
  const left = canonicalTitle(a);
  const right = canonicalTitle(b);
  if (!left || !right) return false;
  if (left === right) return true;

  // Containment handles minor extras like "купи билети за" leftovers or venue noise.
  if (left.includes(right) || right.includes(left)) return true;

  const leftTokens = new Set(left.split(" ").filter((t) => t.length > 2));
  const rightTokens = new Set(right.split(" ").filter((t) => t.length > 2));
  if (leftTokens.size === 0 || rightTokens.size === 0) return false;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  const overlapRatio = overlap / Math.min(leftTokens.size, rightTokens.size);
  return overlapRatio >= 0.75;
}

export function normalizeVenue(name: string) {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function venueKey(name: string) {
  return normalizeVenue(name).replace(/[^a-zа-яё0-9]/giu, "");
}

export function venuesMatch(a?: string | null, b?: string | null) {
  const left = a?.trim();
  const right = b?.trim();

  // If either side has no venue, don't block a title+date match.
  if (!left || !right) return true;

  const leftKey = venueKey(left);
  const rightKey = venueKey(right);
  if (!leftKey || !rightKey) return true;
  if (leftKey === rightKey) return true;
  if (leftKey.includes(rightKey) || rightKey.includes(leftKey)) return true;

  const leftNorm = normalizeVenue(left);
  const rightNorm = normalizeVenue(right);
  return leftNorm.includes(rightNorm) || rightNorm.includes(leftNorm);
}

function sofiaDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function sofiaHour(date: Date) {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Sofia",
      hour: "2-digit",
      hour12: false,
    }).format(date)
  );
}

function sofiaMinute(date: Date) {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Sofia",
      minute: "2-digit",
    }).format(date)
  );
}

/** Many listing pages use date-only values that we default to 10:00 Sofia. */
export function isLikelyDefaultStartTime(date: Date) {
  return sofiaHour(date) === 10 && sofiaMinute(date) === 0;
}

/**
 * Prefer a real clock time over a date-only default (10:00).
 * When both look specific, keep the existing value.
 */
export function preferStartAt(existing: Date, incoming: Date) {
  const existingDefault = isLikelyDefaultStartTime(existing);
  const incomingDefault = isLikelyDefaultStartTime(incoming);
  if (existingDefault && !incomingDefault) return incoming;
  if (!existingDefault && incomingDefault) return existing;
  return existing;
}

export function preferEndAt(
  existing?: Date | null,
  incoming?: Date | null
): Date | null | undefined {
  if (incoming && !existing) return incoming;
  if (existing && !incoming) return existing;
  return existing ?? incoming;
}

/**
 * Same calendar day in Europe/Sofia.
 * Time is soft: only reject when both look like real clock times and differ a lot
 * (many sources use date-only defaults like 10:00).
 */
export function startsMatch(a: Date, b: Date) {
  if (sofiaDayKey(a) !== sofiaDayKey(b)) return false;

  const hourA = sofiaHour(a);
  const hourB = sofiaHour(b);
  const bothSeemSpecific = hourA !== 10 || hourB !== 10;
  if (!bothSeemSpecific) return true;

  const diffMs = Math.abs(a.getTime() - b.getTime());
  const twelveHours = 12 * 60 * 60 * 1000;
  return diffMs <= twelveHours;
}

export type EventIdentity = {
  title: string;
  startAt: Date;
  venueName?: string | null;
};

export function isSameEvent(a: EventIdentity, b: EventIdentity) {
  return (
    startsMatch(a.startAt, b.startAt) &&
    titlesMatch(a.title, b.title) &&
    venuesMatch(a.venueName, b.venueName)
  );
}

function richnessScore(event: CrawledEvent) {
  return (
    (event.descriptionHtml?.length ?? 0) +
    (event.coverImageUrl ? 200 : 0) +
    (event.registrationUrl && event.registrationUrl !== event.externalUrl
      ? 100
      : 0) +
    (event.venueName ? 50 : 0) +
    (/^[\[\s]*[A-Za-z]/.test(event.title) ? 25 : 0)
  );
}

function mergeDuplicateEvents(preferred: CrawledEvent, other: CrawledEvent): CrawledEvent {
  return {
    ...preferred,
    descriptionHtml: preferred.descriptionHtml || other.descriptionHtml,
    endAt: preferred.endAt ?? other.endAt,
    venueName: preferred.venueName || other.venueName,
    registrationUrl: preferred.registrationUrl || other.registrationUrl,
    coverImageUrl: preferred.coverImageUrl || other.coverImageUrl,
    tags: [...new Set([...(preferred.tags ?? []), ...(other.tags ?? [])])],
    topics: [...new Set([...(preferred.topics ?? []), ...(other.topics ?? [])])],
    eventTypeSlug: preferred.eventTypeSlug || other.eventTypeSlug,
    organizerName: preferred.organizerName || other.organizerName,
  };
}

/** Collapse near-duplicate crawled events, keeping the richer record. */
export function dedupeCrawledEvents(events: CrawledEvent[]): CrawledEvent[] {
  const kept: CrawledEvent[] = [];

  for (const event of events) {
    const index = kept.findIndex((candidate) => isSameEvent(candidate, event));
    if (index === -1) {
      kept.push(event);
      continue;
    }

    const existing = kept[index];
    kept[index] =
      richnessScore(event) > richnessScore(existing)
        ? mergeDuplicateEvents(event, existing)
        : mergeDuplicateEvents(existing, event);
  }

  return kept;
}

export function sofiaDayBounds(date: Date) {
  const day = sofiaDayKey(date);
  // Europe/Sofia is UTC+2 / UTC+3; use noon UTC on that calendar day then expand.
  // Safer: interpret the Sofia date as local midnight via offset guess by month.
  const [year, month, dayNum] = day.split("-").map(Number);
  const isSummer = month >= 4 && month <= 10;
  const offsetHours = isSummer ? 3 : 2;
  const startAt = new Date(Date.UTC(year, month - 1, dayNum, -offsetHours, 0, 0));
  const endAt = new Date(Date.UTC(year, month - 1, dayNum + 1, -offsetHours, 0, 0));
  return { startAt, endAt };
}
