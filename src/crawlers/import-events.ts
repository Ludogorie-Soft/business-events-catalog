import {
  canonicalTitle,
  dedupeCrawledEvents,
  isSameEvent,
  preferEndAt,
  preferStartAt,
  sofiaDayBounds,
} from "@/crawlers/event-similarity";
import { filterUpcomingEvents } from "@/crawlers/filter-events";
import { inferEventTypeSlug } from "@/crawlers/infer-event-type";
import { inferTopicSlugs } from "@/crawlers/infer-topics";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import type {
  CrawledEvent,
  CrawledLanguage,
  CrawledLocationType,
  CrawledPriceType,
  ImportEventsResult,
} from "@/crawlers/types";
import type {
  EventStatus,
  Language,
  LocationType,
  PriceType,
} from "@/generated/prisma/client";

const DEFAULT_EVENT_TYPE_SLUG = "meetup";
const DEFAULT_CITY_SLUG = "online";

function resolveImportStatus(existingStatus?: EventStatus): EventStatus {
  if (existingStatus === "HIDDEN") return "HIDDEN";
  if (existingStatus === "BLACKLISTED") return "BLACKLISTED";
  return "PUBLISHED";
}

async function generateUniqueSlug(title: string, excludeId?: string) {
  const base = slugify(title) || "event";
  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) break;
    slug = `${base}-${counter++}`;
  }

  return slug;
}

function mapLocationType(value: CrawledLocationType): LocationType {
  return value.toUpperCase() as LocationType;
}

function mapPriceType(value?: CrawledPriceType): PriceType {
  if (value === "free") return "FREE";
  if (value === "paid") return "PAID";
  return "UNKNOWN";
}

function mapLanguage(value?: CrawledLanguage): Language | null {
  if (value === "bg") return "BG";
  if (value === "en") return "EN";
  if (value === "mixed") return "MIXED";
  return null;
}

async function resolveCityId(citySlug?: string) {
  const slug = citySlug?.trim().toLowerCase() || DEFAULT_CITY_SLUG;
  const city = await prisma.city.findUnique({ where: { slug } });
  if (!city) {
    throw new Error(`City not found for slug: ${slug}`);
  }
  return city.id;
}

async function resolveEventTypeId(slug: string) {
  const eventType = await prisma.eventType.findUnique({
    where: { slug },
  });
  if (eventType) return eventType.id;

  const fallback = await prisma.eventType.findUnique({
    where: { slug: DEFAULT_EVENT_TYPE_SLUG },
  });
  if (!fallback) {
    throw new Error(`Default event type not found: ${DEFAULT_EVENT_TYPE_SLUG}`);
  }
  return fallback.id;
}

async function resolveOrganizerId(name?: string) {
  if (!name?.trim()) return null;

  const existing = await prisma.organizer.findFirst({
    where: { name: name.trim() },
  });
  if (existing) return existing.id;

  const created = await prisma.organizer.create({
    data: { name: name.trim() },
  });
  return created.id;
}

async function resolveVenueId(cityId: string, venueName?: string) {
  if (!venueName?.trim()) return null;

  const name = venueName.trim();
  const existing = await prisma.venue.findFirst({
    where: {
      cityId,
      name: { equals: name, mode: "insensitive" },
    },
  });
  if (existing) return existing.id;

  const created = await prisma.venue.create({
    data: { cityId, name },
  });
  return created.id;
}

async function findContentDuplicate(crawled: CrawledEvent, cityId: string) {
  const { startAt, endAt } = sofiaDayBounds(crawled.startAt);
  const candidates = await prisma.event.findMany({
    where: {
      cityId,
      startAt: { gte: startAt, lt: endAt },
      status: { notIn: ["CANCELLED"] },
    },
    include: { venue: { select: { name: true } } },
  });

  return (
    candidates.find((candidate) =>
      isSameEvent(
        {
          title: candidate.title,
          startAt: candidate.startAt,
          venueName: candidate.venue?.name,
        },
        {
          title: crawled.title,
          startAt: crawled.startAt,
          venueName: crawled.venueName,
        }
      )
    ) ?? null
  );
}

async function loadBlacklistedTitles() {
  const rows = await prisma.eventTitleBlacklist.findMany({
    select: { normalizedTitle: true },
  });
  return new Set(rows.map((row) => row.normalizedTitle));
}

function isTitleBlacklisted(title: string, blacklist: Set<string>) {
  const normalized = canonicalTitle(title);
  return Boolean(normalized && blacklist.has(normalized));
}

async function resolveTagIds(tags?: string[]) {
  if (!tags?.length) return [];

  const records = await prisma.tag.findMany({
    where: { slug: { in: tags.map((tag) => tag.toLowerCase()) } },
    select: { id: true, slug: true },
  });

  return records.map(({ id }) => id);
}

async function resolveTopicIds(topicSlugs?: string[]) {
  if (!topicSlugs?.length) return [];

  const records = await prisma.topic.findMany({
    where: { slug: { in: topicSlugs.map((slug) => slug.toLowerCase()) } },
    select: { id: true, slug: true },
  });

  return records.map(({ id }) => id);
}

async function getSystemCreatedById() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });

  if (!admin) {
    throw new Error("No admin user found to assign as createdBy for crawled events.");
  }

  return admin.id;
}

export async function importCrawledEvents(
  sourceId: string,
  events: CrawledEvent[]
): Promise<ImportEventsResult> {
  const upcomingEvents = dedupeCrawledEvents(filterUpcomingEvents(events));
  const blacklistedTitles = await loadBlacklistedTitles();

  const createdById = await getSystemCreatedById();

  let eventsCreated = 0;
  let eventsUpdated = 0;

  for (const crawled of upcomingEvents) {
    if (isTitleBlacklisted(crawled.title, blacklistedTitles)) {
      continue;
    }

    const cityId = await resolveCityId(crawled.city);
    const organizerId = await resolveOrganizerId(crawled.organizerName);
    const venueId = await resolveVenueId(cityId, crawled.venueName);
    const tagIds = await resolveTagIds(crawled.tags);
    const topicIds = await resolveTopicIds(
      inferTopicSlugs({
        title: crawled.title,
        descriptionHtml: crawled.descriptionHtml,
        tags: crawled.tags,
        topics: crawled.topics,
      })
    );
    const eventTypeId = await resolveEventTypeId(
      inferEventTypeSlug({
        title: crawled.title,
        descriptionHtml: crawled.descriptionHtml,
        tags: crawled.tags,
        locationType: crawled.locationType,
        eventTypeSlug: crawled.eventTypeSlug,
      })
    );

    const existingByUrl = crawled.externalUrl
      ? await prisma.event.findUnique({
          where: { externalUrl: crawled.externalUrl },
        })
      : null;
    const existing =
      existingByUrl ?? (await findContentDuplicate(crawled, cityId));

    if (existing?.status === "BLACKLISTED") {
      continue;
    }

    if (existing) {
      const isUrlMatch = Boolean(existingByUrl);
      const nextStatus = resolveImportStatus(existing.status);
      await prisma.$transaction(async (tx) => {
        await tx.event.update({
          where: { id: existing.id },
          data: {
            title: isUrlMatch ? crawled.title : existing.title,
            slug:
              isUrlMatch && existing.title !== crawled.title
                ? await generateUniqueSlug(crawled.title, existing.id)
                : existing.slug,
            shortDescription: crawled.descriptionHtml
              ? crawled.descriptionHtml
                  .replace(/<[^>]+>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 280)
              : existing.shortDescription,
            descriptionHtml:
              crawled.descriptionHtml ?? existing.descriptionHtml,
            descriptionText: crawled.descriptionHtml
              ? crawled.descriptionHtml
                  .replace(/<[^>]+>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()
              : existing.descriptionText,
            startAt: isUrlMatch
              ? crawled.startAt
              : preferStartAt(existing.startAt, crawled.startAt),
            endAt: isUrlMatch
              ? (crawled.endAt ?? existing.endAt)
              : (preferEndAt(existing.endAt, crawled.endAt) ?? null),
            cityId,
            eventTypeId,
            locationType: mapLocationType(crawled.locationType),
            priceType: mapPriceType(crawled.priceType),
            priceMin: crawled.priceMin ?? null,
            priceMax: crawled.priceMax ?? null,
            currency: crawled.currency ?? null,
            language: mapLanguage(crawled.language) ?? existing.language,
            registrationUrl: isUrlMatch
              ? (crawled.registrationUrl ?? crawled.externalUrl)
              : (existing.registrationUrl ??
                crawled.registrationUrl ??
                crawled.externalUrl),
            onlineUrl:
              crawled.locationType === "online" ? crawled.externalUrl : null,
            externalUrl: isUrlMatch
              ? crawled.externalUrl
              : (existing.externalUrl ?? crawled.externalUrl),
            coverImageUrl: crawled.coverImageUrl ?? existing.coverImageUrl,
            sourceId: isUrlMatch ? sourceId : existing.sourceId,
            organizerId: organizerId ?? existing.organizerId,
            venueId: venueId ?? existing.venueId,
            status: nextStatus,
          },
        });

        await tx.eventTag.deleteMany({ where: { eventId: existing.id } });
        if (tagIds.length > 0) {
          await tx.eventTag.createMany({
            data: tagIds.map((tagId) => ({ eventId: existing.id, tagId })),
          });
        }

        await tx.eventTopic.deleteMany({ where: { eventId: existing.id } });
        if (topicIds.length > 0) {
          await tx.eventTopic.createMany({
            data: topicIds.map((topicId) => ({ eventId: existing.id, topicId })),
          });
        }
      });
      eventsUpdated += 1;
      continue;
    }

    const slug = await generateUniqueSlug(crawled.title);

    await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          title: crawled.title,
          shortDescription: crawled.descriptionHtml
            ? crawled.descriptionHtml
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 280)
            : null,
          descriptionHtml: crawled.descriptionHtml ?? null,
          descriptionText: crawled.descriptionHtml
            ? crawled.descriptionHtml
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
            : null,
          startAt: crawled.startAt,
          endAt: crawled.endAt ?? null,
          cityId,
          eventTypeId,
          locationType: mapLocationType(crawled.locationType),
          priceType: mapPriceType(crawled.priceType),
          priceMin: crawled.priceMin ?? null,
          priceMax: crawled.priceMax ?? null,
          currency: crawled.currency ?? null,
          language: mapLanguage(crawled.language),
          registrationUrl: crawled.registrationUrl ?? crawled.externalUrl,
          onlineUrl:
            crawled.locationType === "online" ? crawled.externalUrl : null,
          externalUrl: crawled.externalUrl,
          coverImageUrl: crawled.coverImageUrl ?? null,
          sourceId,
          organizerId,
          venueId,
          status: "PUBLISHED" as EventStatus,
          slug,
          createdById,
        },
      });

      if (tagIds.length > 0) {
        await tx.eventTag.createMany({
          data: tagIds.map((tagId) => ({ eventId: event.id, tagId })),
        });
      }

      if (topicIds.length > 0) {
        await tx.eventTopic.createMany({
          data: topicIds.map((topicId) => ({ eventId: event.id, topicId })),
        });
      }
    });

    eventsCreated += 1;
  }

  return {
    eventsFound: upcomingEvents.length,
    eventsCreated,
    eventsUpdated,
  };
}
