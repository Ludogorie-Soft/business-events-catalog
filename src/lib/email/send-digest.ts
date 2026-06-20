import type { Prisma } from "@/generated/prisma/client";
import type {
  City,
  Event,
  EventType,
  Subscription,
  SubscriptionCity,
  SubscriptionEventType,
  SubscriptionTag,
  SubscriptionTopic,
  Tag,
  Topic,
  User,
  Venue,
} from "@/generated/prisma/client";
import { sendEmail } from "@/lib/email/brevo";
import { buildDigestEmailHtml } from "@/lib/email/templates/digest";
import { prisma } from "@/lib/prisma";

export type SubscriptionWithRelations = Subscription & {
  user: User;
  cities: (SubscriptionCity & { city: City })[];
  eventTypes: (SubscriptionEventType & { eventType: EventType })[];
  topics: (SubscriptionTopic & { topic: Topic })[];
  tags: (SubscriptionTag & { tag: Tag })[];
};

export type DigestEvent = Event & {
  city: City;
  eventType: EventType;
  venue: Venue | null;
};

const eventInclude = {
  city: true,
  eventType: true,
  venue: true,
} as const;

export function buildSubscriptionEventWhere(
  subscription: SubscriptionWithRelations
): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = {
    status: "PUBLISHED",
    startAt: { gte: new Date() },
  };

  if (subscription.cities.length > 0) {
    where.cityId = { in: subscription.cities.map(({ cityId }) => cityId) };
  }
  if (subscription.eventTypes.length > 0) {
    where.eventTypeId = {
      in: subscription.eventTypes.map(({ eventTypeId }) => eventTypeId),
    };
  }
  if (subscription.topics.length > 0) {
    where.topics = {
      some: { topicId: { in: subscription.topics.map(({ topicId }) => topicId) } },
    };
  }
  if (subscription.tags.length > 0) {
    where.tags = {
      some: { tagId: { in: subscription.tags.map(({ tagId }) => tagId) } },
    };
  }
  if (subscription.priceType) {
    where.priceType = subscription.priceType;
  }
  if (subscription.locationType) {
    where.locationType = subscription.locationType;
  }
  if (subscription.language) {
    where.language = subscription.language;
  }
  if (subscription.maxPrice != null) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { priceType: "FREE" },
          { priceMin: { lte: subscription.maxPrice } },
          { priceMax: { lte: subscription.maxPrice } },
        ],
      },
    ];
  }

  return where;
}

async function getAlreadySentEventIds(subscriptionId: string) {
  const rows = await prisma.emailNotificationEvent.findMany({
    where: { notification: { subscriptionId } },
    select: { eventId: true },
  });
  return rows.map(({ eventId }) => eventId);
}

export async function findMatchingUnsentEvents(
  subscription: SubscriptionWithRelations
): Promise<DigestEvent[]> {
  const sentEventIds = await getAlreadySentEventIds(subscription.id);
  const where = buildSubscriptionEventWhere(subscription);

  if (sentEventIds.length > 0) {
    where.id = { notIn: sentEventIds };
  }

  return prisma.event.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: eventInclude,
  });
}

async function recordEmailNotification({
  userId,
  subscriptionId,
  subject,
  eventIds,
  status,
  errorMessage,
}: {
  userId: string;
  subscriptionId: string;
  subject: string;
  eventIds: string[];
  status: "SENT" | "FAILED";
  errorMessage?: string;
}) {
  return prisma.emailNotification.create({
    data: {
      userId,
      subscriptionId,
      subject,
      status,
      errorMessage,
      ...(status === "SENT" && eventIds.length > 0
        ? {
            events: {
              create: eventIds.map((eventId) => ({ eventId })),
            },
          }
        : {}),
    },
  });
}

export async function sendDigestForSubscription(
  subscription: SubscriptionWithRelations,
  digestType: "daily" | "weekly"
) {
  const events = await findMatchingUnsentEvents(subscription);
  if (events.length === 0) {
    return { subscriptionId: subscription.id, status: "skipped" as const, eventCount: 0 };
  }

  const subject =
    digestType === "daily"
      ? `Ежедневен дайджест: ${subscription.name}`
      : `Седмичен дайджест: ${subscription.name}`;

  const result = await sendEmail({
    to: { email: subscription.user.email, name: subscription.user.name },
    subject,
    htmlContent: buildDigestEmailHtml({
      subscriptionName: subscription.name,
      events,
      digestType,
    }),
  });

  if (result.ok) {
    await recordEmailNotification({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      subject,
      eventIds: events.map(({ id }) => id),
      status: "SENT",
    });
    return {
      subscriptionId: subscription.id,
      status: "sent" as const,
      eventCount: events.length,
      messageId: result.messageId,
    };
  }

  if ("skipped" in result && result.skipped) {
    return {
      subscriptionId: subscription.id,
      status: "skipped" as const,
      eventCount: events.length,
      reason: result.reason,
    };
  }

  const errorMessage = "error" in result ? result.error : "Unknown email error";
  await recordEmailNotification({
    userId: subscription.userId,
    subscriptionId: subscription.id,
    subject,
    eventIds: events.map(({ id }) => id),
    status: "FAILED",
    errorMessage,
  });

  return {
    subscriptionId: subscription.id,
    status: "failed" as const,
    eventCount: events.length,
    error: errorMessage,
  };
}

const subscriptionInclude = {
  user: true,
  cities: { include: { city: true } },
  eventTypes: { include: { eventType: true } },
  topics: { include: { topic: true } },
  tags: { include: { tag: true } },
} as const;

export async function getActiveSubscriptionsByFrequency(
  frequency: "DAILY" | "WEEKLY"
): Promise<SubscriptionWithRelations[]> {
  return prisma.subscription.findMany({
    where: { active: true, frequency },
    include: subscriptionInclude,
  });
}
