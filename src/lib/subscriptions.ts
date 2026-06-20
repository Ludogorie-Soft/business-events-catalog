import { prisma } from "@/lib/prisma";

const subscriptionInclude = {
  cities: { include: { city: true } },
  eventTypes: { include: { eventType: true } },
  topics: { include: { topic: true } },
  tags: { include: { tag: true } },
} as const;

export async function getUserSubscriptions(userId: string) {
  return prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: subscriptionInclude,
  });
}

export async function getUserSubscription(userId: string, id: string) {
  return prisma.subscription.findFirst({
    where: { id, userId },
    include: subscriptionInclude,
  });
}

export type UserSubscription = Awaited<ReturnType<typeof getUserSubscriptions>>[number];
