import { prisma } from "@/lib/prisma";
import type {
  AttendanceStatus,
  EventStatus,
  LocationType,
  PriceType,
  Language,
} from "@/generated/prisma/client";

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
  status?: EventStatus;
  /** Defaults to "upcoming". Multi-day events stay visible until endAt. */
  timeframe?: EventTimeframe;
};

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
  const timeframe = resolveTimeframe(filters, now);
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
  if (filters.dateFrom || filters.dateTo) {
    where.startAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
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

export async function getFilterOptions() {
  const [cities, eventTypes, topics, tags] = await Promise.all([
    prisma.city.findMany({ orderBy: { nameBg: "asc" } }),
    prisma.eventType.findMany({ orderBy: { nameBg: "asc" } }),
    prisma.topic.findMany({ orderBy: { nameBg: "asc" } }),
    prisma.tag.findMany({ orderBy: { nameBg: "asc" } }),
  ]);
  return { cities, eventTypes, topics, tags };
}
