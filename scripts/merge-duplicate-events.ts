import "dotenv/config";
import { isSameEvent, preferStartAt, preferEndAt } from "../src/crawlers/event-similarity";
import { prisma } from "../src/lib/prisma";

const SOURCE_PREFERENCE: Record<string, number> = {
  eno: 100,
  gosofia: 10,
};

function sourceScore(sourceKey?: string | null) {
  if (!sourceKey) return 0;
  return SOURCE_PREFERENCE[sourceKey] ?? 50;
}

async function main() {
  const events = await prisma.event.findMany({
    where: { status: { not: "CANCELLED" } },
    include: {
      venue: { select: { id: true, name: true } },
      source: { select: { sourceKey: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const removedIds = new Set<string>();
  let merged = 0;

  for (let i = 0; i < events.length; i++) {
    const left = events[i];
    if (removedIds.has(left.id)) continue;

    for (let j = i + 1; j < events.length; j++) {
      const right = events[j];
      if (removedIds.has(right.id)) continue;

      const same = isSameEvent(
        {
          title: left.title,
          startAt: left.startAt,
          venueName: left.venue?.name,
        },
        {
          title: right.title,
          startAt: right.startAt,
          venueName: right.venue?.name,
        }
      );
      if (!same) continue;

      const preferRight =
        sourceScore(right.source?.sourceKey) > sourceScore(left.source?.sourceKey);
      const keeper = preferRight ? right : left;
      const duplicate = preferRight ? left : right;

      const startAt = preferStartAt(keeper.startAt, duplicate.startAt);
      const endAt = preferEndAt(keeper.endAt, duplicate.endAt) ?? null;
      const venueId = keeper.venueId ?? duplicate.venueId;
      const descriptionHtml =
        (keeper.descriptionHtml?.length ?? 0) >=
        (duplicate.descriptionHtml?.length ?? 0)
          ? keeper.descriptionHtml
          : duplicate.descriptionHtml;
      const coverImageUrl = keeper.coverImageUrl ?? duplicate.coverImageUrl;
      const registrationUrl =
        keeper.source?.sourceKey === "eno"
          ? keeper.registrationUrl ?? duplicate.registrationUrl
          : duplicate.source?.sourceKey === "eno"
            ? duplicate.registrationUrl ?? keeper.registrationUrl
            : keeper.registrationUrl ?? duplicate.registrationUrl;

      await prisma.$transaction(async (tx) => {
        await tx.event.update({
          where: { id: keeper.id },
          data: {
            startAt,
            endAt,
            venueId,
            descriptionHtml,
            descriptionText:
              descriptionHtml
                ?.replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim() ?? keeper.descriptionText,
            shortDescription:
              descriptionHtml
                ?.replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 280) ?? keeper.shortDescription,
            coverImageUrl,
            registrationUrl,
            organizerId: keeper.organizerId ?? duplicate.organizerId,
          },
        });

        // Move attendance to keeper when possible.
        const attendance = await tx.eventAttendance.findMany({
          where: { eventId: duplicate.id },
        });
        for (const row of attendance) {
          const exists = await tx.eventAttendance.findUnique({
            where: {
              userId_eventId: { userId: row.userId, eventId: keeper.id },
            },
          });
          if (!exists) {
            await tx.eventAttendance.create({
              data: {
                userId: row.userId,
                eventId: keeper.id,
                status: row.status,
              },
            });
          }
        }

        await tx.event.delete({ where: { id: duplicate.id } });
      });

      removedIds.add(duplicate.id);
      merged += 1;
      console.log(
        `Merged "${duplicate.slug}" (${duplicate.source?.sourceKey}) into "${keeper.slug}" (${keeper.source?.sourceKey})`
      );
    }
  }

  console.log(`Done. Merged ${merged} duplicate event(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
