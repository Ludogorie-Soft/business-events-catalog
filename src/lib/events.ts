import { prisma } from "@/lib/prisma";
import type {
  AttendanceStatus,
  EventStatus,
  LocationType,
  PriceType,
  Language,
} from "@/generated/prisma/client";
import {
  addCalendarDays,
  isWeekPreset,
  resolveWeekRange,
  type WeekPreset,
} from "@/lib/week-range";

const ATTENDANCE_SORT_ORDER: Partial<Record<AttendanceStatus, number>> = {
  ATTENDING: 0,
  INTERESTED: 1,
};

export function sortEventsByUserAttendance<T extends { id: string; startAt: Date }>(
  events: T[],
  attendanceByEventId: Map<string, AttendanceStatus>
): T[] {
  return [...events].sort((a, b) => {
    const aOrder = ATTENDANCE_SORT_ORDER[attendanceByEventId.get(a.id)!] ?? 2;
    const bOrder = ATTENDANCE_SORT_ORDER[attendanceByEventId.get(b.id)!] ?? 2;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });
}

export type EventTimeframe = "upcoming" | "past" | "all";

export type EventFilters = {
  citySlug?: string;
  eventTypeSlug?: string;
  topicSlug?: string;
  tagSlug?: string;
  priceType?: PriceType;
  locationType?: LocationType;
  language?: Language;
  dateFrom?: string;
  dateTo?: string;
  /** Relative Mon–Sun range; takes precedence over dateFrom/dateTo when set. */
  week?: WeekPreset;
  status?: EventStatus;
  /** Defaults to "upcoming". Multi-day events stay visible until endAt. */
  timeframe?: EventTimeframe;
};

/** Expand week preset (or pass through absolute dates) into YYYY-MM-DD bounds. */
export function resolveEventDateRange(
  filters: Pick<EventFilters, "week" | "dateFrom" | "dateTo">,
  now = new Date()
): { dateFrom?: string; dateTo?: string } {
  if (isWeekPreset(filters.week)) {
    return resolveWeekRange(filters.week, now);
  }
  return { dateFrom: filters.dateFrom, dateTo: filters.dateTo };
}

/**
 * Inclusive YYYY-MM-DD → Prisma startAt bounds.
 * End date uses exclusive next-day so the full `to` calendar day is included.
 */
function startAtDateWhere(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return undefined;
  return {
    ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
    ...(dateTo ? { lt: new Date(addCalendarDays(dateTo, 1)) } : {}),
  };
}

function localTodayIsoDate(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True when a YYYY-MM-DD filter date is strictly before today (local). */
function isFilterDateInPast(dateStr: string, now = new Date()) {
  return dateStr < localTodayIsoDate(now);
}

function resolveTimeframe(filters: EventFilters, now = new Date()): EventTimeframe {
  if (filters.timeframe) return filters.timeframe;

  // Past "От дата" / "До дата" should include archived events in the range
  const fromInPast = filters.dateFrom && isFilterDateInPast(filters.dateFrom, now);
  const toInPast = filters.dateTo && isFilterDateInPast(filters.dateTo, now);
  if (fromInPast || toInPast) return "all";

  return "upcoming";
}

function timeframeWhere(timeframe: EventTimeframe, now: Date) {
  if (timeframe === "all") return undefined;

  // Upcoming while endAt (or startAt if no end) is still in the future
  const upcoming = {
    OR: [
      { endAt: { gte: now } },
      { AND: [{ endAt: null }, { startAt: { gte: now } }] },
    ],
  };

  if (timeframe === "upcoming") return upcoming;

  return {
    OR: [
      { endAt: { lt: now } },
      { AND: [{ endAt: null }, { startAt: { lt: now } }] },
    ],
  };
}

export async function getEvents(filters: EventFilters = {}) {
  const now = new Date();
  const { dateFrom, dateTo } = resolveEventDateRange(filters, now);
  const timeframe = resolveTimeframe({ ...filters, dateFrom, dateTo }, now);
  const where: Record<string, unknown> = {
    status: filters.status ?? "PUBLISHED",
    ...timeframeWhere(timeframe, now),
  };

  if (filters.citySlug) {
    where.city = { slug: filters.citySlug };
  }
  if (filters.eventTypeSlug) {
    where.eventType = { slug: filters.eventTypeSlug };
  }
  if (filters.topicSlug) {
    where.topics = { some: { topic: { slug: filters.topicSlug } } };
  }
  if (filters.tagSlug) {
    where.tags = { some: { tag: { slug: filters.tagSlug } } };
  }
  if (filters.priceType) {
    where.priceType = filters.priceType;
  }
  if (filters.locationType) {
    where.locationType = filters.locationType;
  }
  if (filters.language) {
    where.language = filters.language;
  }
  const startAt = startAtDateWhere(dateFrom, dateTo);
  if (startAt) {
    where.startAt = startAt;
  }

  return prisma.event.findMany({
    where,
    orderBy: { startAt: timeframe === "past" ? "desc" : "asc" },
    include: {
      city: true,
      eventType: true,
      venue: true,
      organizer: true,
      topics: { include: { topic: true } },
      tags: { include: { tag: true } },
    },
  });
}

export async function getEventBySlug(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    include: {
      city: true,
      eventType: true,
      venue: true,
      organizer: true,
      topics: { include: { topic: true } },
      tags: { include: { tag: true } },
      source: true,
    },
  });
}

export async function getFilterOptions(
  filters: Pick<EventFilters, "dateFrom" | "dateTo" | "week" | "timeframe"> = {}
) {
  const now = new Date();
  const { dateFrom, dateTo } = resolveEventDateRange(filters, now);
  const timeframe = resolveTimeframe({ ...filters, dateFrom, dateTo }, now);
  const startAt = startAtDateWhere(dateFrom, dateTo);
  const baseWhere = {
    status: "PUBLISHED" as const,
    ...timeframeWhere(timeframe, now),
    ...(startAt ? { startAt } : {}),
  };

  const [
    cities,
    eventTypes,
    topics,
    tags,
    cityCounts,
    eventTypeCounts,
    topicCounts,
    tagCounts,
    priceCounts,
    locationCounts,
    languageCounts,
  ] = await Promise.all([
    prisma.city.findMany({ orderBy: { nameBg: "asc" } }),
    prisma.eventType.findMany({ orderBy: { nameBg: "asc" } }),
    prisma.topic.findMany({ orderBy: { nameBg: "asc" } }),
    prisma.tag.findMany({ orderBy: { nameBg: "asc" } }),
    prisma.event.groupBy({
      by: ["cityId"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.event.groupBy({
      by: ["eventTypeId"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.eventTopic.groupBy({
      by: ["topicId"],
      where: { event: baseWhere },
      _count: { _all: true },
    }),
    prisma.eventTag.groupBy({
      by: ["tagId"],
      where: { event: baseWhere },
      _count: { _all: true },
    }),
    prisma.event.groupBy({
      by: ["priceType"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.event.groupBy({
      by: ["locationType"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.event.groupBy({
      by: ["language"],
      where: { ...baseWhere, language: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const toCountMap = <K extends string>(
    rows: Array<Record<K, string | null> & { _count: { _all: number } }>,
    key: K
  ) => {
    const map: Partial<Record<string, number>> = {};
    for (const row of rows) {
      const id = row[key];
      if (id) map[id] = row._count._all;
    }
    return map;
  };

  const cityCountById = toCountMap(cityCounts, "cityId");
  const eventTypeCountById = toCountMap(eventTypeCounts, "eventTypeId");
  const topicCountById = toCountMap(topicCounts, "topicId");
  const tagCountById = toCountMap(tagCounts, "tagId");

  return {
    cities: cities.map((city) => ({
      ...city,
      count: cityCountById[city.id] ?? 0,
    })),
    eventTypes: eventTypes.map((eventType) => ({
      ...eventType,
      count: eventTypeCountById[eventType.id] ?? 0,
    })),
    topics: topics.map((topic) => ({
      ...topic,
      count: topicCountById[topic.id] ?? 0,
    })),
    tags: tags.map((tag) => ({
      ...tag,
      count: tagCountById[tag.id] ?? 0,
    })),
    priceCounts: Object.fromEntries(
      priceCounts.map((row) => [row.priceType, row._count._all])
    ) as Partial<Record<PriceType, number>>,
    locationCounts: Object.fromEntries(
      locationCounts.map((row) => [row.locationType, row._count._all])
    ) as Partial<Record<LocationType, number>>,
    languageCounts: Object.fromEntries(
      languageCounts
        .filter((row) => row.language != null)
        .map((row) => [row.language!, row._count._all])
    ) as Partial<Record<Language, number>>,
  };
}
