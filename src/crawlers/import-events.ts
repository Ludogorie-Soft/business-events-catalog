import { filterUpcomingEvents } from "@/crawlers/filter-events";
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

const DEFAULT_EVENT_TYPE_SLUG = "webinar";
const DEFAULT_CITY_SLUG = "online";

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

async function resolveEventTypeId() {
  const eventType = await prisma.eventType.findUnique({
    where: { slug: DEFAULT_EVENT_TYPE_SLUG },
  });
  if (!eventType) {
    throw new Error(`Default event type not found: ${DEFAULT_EVENT_TYPE_SLUG}`);
  }
  return eventType.id;
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

async function resolveTagIds(tags?: string[]) {
  if (!tags?.length) return [];

  const records = await prisma.tag.findMany({
    where: { slug: { in: tags.map((tag) => tag.toLowerCase()) } },
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
  const upcomingEvents = filterUpcomingEvents(events);

  const [createdById, defaultEventTypeId] = await Promise.all([
    getSystemCreatedById(),
    resolveEventTypeId(),
  ]);

  let eventsCreated = 0;
  let eventsUpdated = 0;

  for (const crawled of upcomingEvents) {
    const cityId = await resolveCityId(crawled.city);
    const organizerId = await resolveOrganizerId(crawled.organizerName);
    const tagIds = await resolveTagIds(crawled.tags);

    const existing = await prisma.event.findUnique({
      where: { externalUrl: crawled.externalUrl },
    });

    const data = {
      title: crawled.title,
      shortDescription: crawled.descriptionHtml
        ? crawled.descriptionHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280)
        : null,
      descriptionHtml: crawled.descriptionHtml ?? null,
      descriptionText: crawled.descriptionHtml
        ? crawled.descriptionHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : null,
      startAt: crawled.startAt,
      endAt: crawled.endAt ?? null,
      cityId,
      eventTypeId: defaultEventTypeId,
      locationType: mapLocationType(crawled.locationType),
      priceType: mapPriceType(crawled.priceType),
      language: mapLanguage(crawled.language),
      registrationUrl: crawled.registrationUrl ?? crawled.externalUrl,
      onlineUrl: crawled.locationType === "online" ? crawled.externalUrl : null,
      externalUrl: crawled.externalUrl,
      coverImageUrl: crawled.coverImageUrl ?? null,
      sourceId,
      organizerId,
      status: "PUBLISHED" as EventStatus,
    };

    if (existing) {
      await prisma.$transaction(async (tx) => {
        await tx.event.update({
          where: { id: existing.id },
          data: {
            ...data,
            slug:
              existing.title !== crawled.title
                ? await generateUniqueSlug(crawled.title, existing.id)
                : existing.slug,
          },
        });

        await tx.eventTag.deleteMany({ where: { eventId: existing.id } });
        if (tagIds.length > 0) {
          await tx.eventTag.createMany({
            data: tagIds.map((tagId) => ({ eventId: existing.id, tagId })),
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
          ...data,
          slug,
          createdById,
        },
      });

      if (tagIds.length > 0) {
        await tx.eventTag.createMany({
          data: tagIds.map((tagId) => ({ eventId: event.id, tagId })),
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
