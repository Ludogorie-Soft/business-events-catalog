import "dotenv/config";
import { inferEventTypeSlug } from "../src/crawlers/infer-event-type";
import { prisma } from "../src/lib/prisma";

async function main() {
  const eventTypes = await prisma.eventType.findMany({
    select: { id: true, slug: true },
  });
  const typeIdBySlug = new Map(eventTypes.map((t) => [t.slug, t.id]));
  const fallbackId =
    typeIdBySlug.get("meetup") ?? typeIdBySlug.get("webinar") ?? eventTypes[0]?.id;
  if (!fallbackId) throw new Error("No event types found");

  const events = await prisma.event.findMany({
    where: { status: { in: ["PUBLISHED", "DRAFT"] } },
    select: {
      id: true,
      title: true,
      descriptionHtml: true,
      descriptionText: true,
      locationType: true,
      tags: { include: { tag: true } },
    },
  });

  const counts: Record<string, number> = {};

  for (const event of events) {
    const slug = inferEventTypeSlug({
      title: event.title,
      descriptionHtml: event.descriptionHtml,
      descriptionText: event.descriptionText,
      tags: event.tags.map(({ tag }) => tag.slug),
      locationType: event.locationType,
    });
    const eventTypeId = typeIdBySlug.get(slug) ?? fallbackId;
    counts[slug] = (counts[slug] ?? 0) + 1;

    await prisma.event.update({
      where: { id: event.id },
      data: { eventTypeId },
    });
  }

  console.log({ eventsProcessed: events.length, counts });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
