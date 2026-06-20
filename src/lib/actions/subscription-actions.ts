"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { sendUnsubscribeEmail } from "@/lib/email/send-unsubscribe";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type {
  Language,
  LocationType,
  PriceType,
  SubscriptionFrequency,
} from "@/generated/prisma/client";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthenticated");
  return session.user.id;
}

function parseIds(formData: FormData, key: string) {
  return formData.getAll(key).filter((v): v is string => typeof v === "string" && v.length > 0);
}

function parseOptionalEnum<T extends string>(value: FormDataEntryValue | null) {
  return value && typeof value === "string" && value.length > 0 ? (value as T) : null;
}

function parseSubscriptionForm(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const frequency = formData.get("frequency") as SubscriptionFrequency;
  const priceType = parseOptionalEnum<PriceType>(formData.get("priceType"));
  const locationType = parseOptionalEnum<LocationType>(formData.get("locationType"));
  const language = parseOptionalEnum<Language>(formData.get("language"));
  const maxPriceRaw = formData.get("maxPrice") as string;
  const maxPrice =
    priceType === "FREE" ? null : maxPriceRaw ? Number(maxPriceRaw) : null;

  if (!name) throw new Error("Name is required");
  if (frequency !== "DAILY" && frequency !== "WEEKLY") {
    throw new Error("Invalid frequency");
  }

  return {
    name,
    frequency,
    priceType,
    locationType,
    language,
    maxPrice: maxPrice != null && !Number.isNaN(maxPrice) ? maxPrice : null,
    cityIds: parseIds(formData, "cityIds"),
    eventTypeIds: parseIds(formData, "eventTypeIds"),
    topicIds: parseIds(formData, "topicIds"),
    tagIds: parseIds(formData, "tagIds"),
  };
}

async function syncSubscriptionRelations(
  tx: Prisma.TransactionClient,
  subscriptionId: string,
  {
    cityIds,
    eventTypeIds,
    topicIds,
    tagIds,
  }: {
    cityIds: string[];
    eventTypeIds: string[];
    topicIds: string[];
    tagIds: string[];
  }
) {
  await tx.subscriptionCity.deleteMany({ where: { subscriptionId } });
  await tx.subscriptionEventType.deleteMany({ where: { subscriptionId } });
  await tx.subscriptionTopic.deleteMany({ where: { subscriptionId } });
  await tx.subscriptionTag.deleteMany({ where: { subscriptionId } });

  if (cityIds.length > 0) {
    await tx.subscriptionCity.createMany({
      data: cityIds.map((cityId) => ({ subscriptionId, cityId })),
    });
  }
  if (eventTypeIds.length > 0) {
    await tx.subscriptionEventType.createMany({
      data: eventTypeIds.map((eventTypeId) => ({ subscriptionId, eventTypeId })),
    });
  }
  if (topicIds.length > 0) {
    await tx.subscriptionTopic.createMany({
      data: topicIds.map((topicId) => ({ subscriptionId, topicId })),
    });
  }
  if (tagIds.length > 0) {
    await tx.subscriptionTag.createMany({
      data: tagIds.map((tagId) => ({ subscriptionId, tagId })),
    });
  }
}

export async function createSubscription(formData: FormData) {
  const userId = await requireUserId();
  const data = parseSubscriptionForm(formData);

  await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        userId,
        name: data.name,
        frequency: data.frequency,
        priceType: data.priceType,
        locationType: data.locationType,
        language: data.language,
        maxPrice: data.maxPrice,
      },
    });

    await syncSubscriptionRelations(tx, subscription.id, data);
  });

  revalidatePath("/profile/subscriptions");
  redirect("/profile/subscriptions");
}

export async function updateSubscription(id: string, formData: FormData) {
  const userId = await requireUserId();
  const existing = await prisma.subscription.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Subscription not found");

  const data = parseSubscriptionForm(formData);

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id },
      data: {
        name: data.name,
        frequency: data.frequency,
        priceType: data.priceType,
        locationType: data.locationType,
        language: data.language,
        maxPrice: data.maxPrice,
      },
    });

    await syncSubscriptionRelations(tx, id, data);
  });

  revalidatePath("/profile/subscriptions");
  redirect("/profile/subscriptions");
}

export async function deleteSubscription(id: string) {
  const userId = await requireUserId();
  const existing = await prisma.subscription.findFirst({
    where: { id, userId },
    include: { user: true },
  });
  if (!existing) throw new Error("Subscription not found");

  await prisma.subscription.delete({ where: { id } });

  void sendUnsubscribeEmail(existing.user, existing.name).catch((error) => {
    console.error("[email] Failed to send unsubscribe email:", error);
  });

  revalidatePath("/profile/subscriptions");
}

export async function toggleSubscriptionActive(id: string) {
  const userId = await requireUserId();
  const existing = await prisma.subscription.findFirst({
    where: { id, userId },
    include: { user: true },
  });
  if (!existing) throw new Error("Subscription not found");

  const nextActive = !existing.active;

  await prisma.subscription.update({
    where: { id },
    data: { active: nextActive },
  });

  if (!nextActive) {
    void sendUnsubscribeEmail(existing.user, existing.name).catch((error) => {
      console.error("[email] Failed to send unsubscribe email:", error);
    });
  }

  revalidatePath("/profile/subscriptions");
}
