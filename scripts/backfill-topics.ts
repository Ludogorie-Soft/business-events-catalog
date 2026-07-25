import "dotenv/config";
import { inferTopicSlugs } from "../src/crawlers/infer-topics";
import { prisma } from "../src/lib/prisma";

async function main() {
  const topics = await prisma.topic.findMany({ select: { id: true, slug: true } });
  const topicIdBySlug = new Map(topics.map((t) => [t.slug, t.id]));

  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      descriptionHtml: true,
      descriptionText: true,
      tags: { include: { tag: true } },
    },
  });

  let updated = 0;
  let withTopics = 0;

  for (const event of events) {
    const slugs = inferTopicSlugs({
      title: event.title,
      descriptionHtml: event.descriptionHtml,
      descriptionText: event.descriptionText,
      tags: event.tags.map(({ tag }) => tag.slug),
    });
    const topicIds = slugs
      .map((slug) => topicIdBySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    await prisma.$transaction(async (tx) => {
      await tx.eventTopic.deleteMany({ where: { eventId: event.id } });
      if (topicIds.length > 0) {
        await tx.eventTopic.createMany({
          data: topicIds.map((topicId) => ({ eventId: event.id, topicId })),
        });
      }
    });

    updated += 1;
    if (topicIds.length > 0) withTopics += 1;
  }

  const topicCounts = await prisma.eventTopic.groupBy({
    by: ["topicId"],
    _count: { _all: true },
  });
  const summary = topicCounts.map((row) => ({
    slug: topics.find((t) => t.id === row.topicId)?.slug,
    count: row._count._all,
  }));

  console.log({
    eventsProcessed: updated,
    eventsWithTopics: withTopics,
    topicCounts: summary,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
