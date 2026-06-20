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
};

export async function getEvents(filters: EventFilters = {}) {
  const where: Record<string, unknown> = {
    status: filters.status ?? "PUBLISHED",
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
    orderBy: { startAt: "asc" },
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
