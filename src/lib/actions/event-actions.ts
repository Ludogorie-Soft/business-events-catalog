"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canonicalTitle } from "@/crawlers/event-similarity";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

function isEmptyHtml(html: string | null): boolean {
  if (!html) return true;
  return html.replace(/<[^>]*>/g, "").trim() === "";
}

function requireAdmin() {
  return auth().then((session) => {
    if (!session || session.user.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }
    return session;
  });
}


async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) break;
    slug = `${base}-${counter++}`;
  }

  return slug;
}

export async function createEvent(formData: FormData) {
  const session = await requireAdmin();

  const title = formData.get("title") as string;
  const rawDescriptionHtml = (formData.get("description_html") as string) || null;
  const rawDescriptionText = (formData.get("description_text") as string) || null;
  const rawShortDescription = (formData.get("shortDescription_html") as string) || null;
  const descriptionHtml = isEmptyHtml(rawDescriptionHtml) ? null : rawDescriptionHtml;
  const descriptionText = rawDescriptionText?.trim() || null;
  const shortDescription = isEmptyHtml(rawShortDescription) ? null : rawShortDescription;
  const cityId = formData.get("cityId") as string;
  const eventTypeId = formData.get("eventTypeId") as string;
  const locationType = formData.get("locationType") as string;
  const priceType = formData.get("priceType") as string;
  const language = (formData.get("language") as string) || null;
  const startAt = formData.get("startAt") as string;
  const endAt = (formData.get("endAt") as string) || null;
  const registrationUrl = (formData.get("registrationUrl") as string) || null;
  const onlineUrl = (formData.get("onlineUrl") as string) || null;
  const externalUrl = (formData.get("externalUrl") as string) || null;
  const coverImageUrl = (formData.get("coverImageUrl") as string) || null;
  const capacity = formData.get("capacity") ? Number(formData.get("capacity")) : null;
  const priceMin = formData.get("priceMin") ? Number(formData.get("priceMin")) : null;
  const priceMax = formData.get("priceMax") ? Number(formData.get("priceMax")) : null;
  const publish = formData.get("publish") === "true";
  const tagIds = formData.getAll("tagIds") as string[];
  const topicIds = formData.getAll("topicIds") as string[];

  const slug = await generateUniqueSlug(title);

  const event = await prisma.event.create({
    data: {
      title,
      slug,
      shortDescription: shortDescription || null,
      descriptionText: descriptionText || null,
      descriptionHtml: descriptionHtml || null,
      cityId,
      eventTypeId,
      locationType: locationType as "PHYSICAL" | "ONLINE" | "HYBRID",
      priceType: priceType as "FREE" | "PAID" | "UNKNOWN",
      language: language as "BG" | "EN" | "MIXED" | null,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      registrationUrl,
      onlineUrl,
      externalUrl: externalUrl || null,
      coverImageUrl,
      capacity,
      priceMin,
      priceMax,
      status: publish ? "PUBLISHED" : "DRAFT",
      createdById: session.user.id,
    },
  });

  if (tagIds.length > 0) {
    await prisma.eventTag.createMany({
      data: tagIds.map((tagId) => ({ eventId: event.id, tagId })),
    });
  }

  if (topicIds.length > 0) {
    await prisma.eventTopic.createMany({
      data: topicIds.map((topicId) => ({ eventId: event.id, topicId })),
    });
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/archive");
  revalidatePath("/sources");
  redirect("/admin/events");
}

export async function updateEvent(id: string, formData: FormData) {
  await requireAdmin();

  const title = formData.get("title") as string;
  const rawDescriptionHtml = (formData.get("description_html") as string) || null;
  const rawDescriptionText = (formData.get("description_text") as string) || null;
  const rawShortDescription = (formData.get("shortDescription_html") as string) || null;
  const descriptionHtml = isEmptyHtml(rawDescriptionHtml) ? null : rawDescriptionHtml;
  const descriptionText = rawDescriptionText?.trim() || null;
  const shortDescription = isEmptyHtml(rawShortDescription) ? null : rawShortDescription;
  const cityId = formData.get("cityId") as string;
  const eventTypeId = formData.get("eventTypeId") as string;
  const locationType = formData.get("locationType") as string;
  const priceType = formData.get("priceType") as string;
  const language = (formData.get("language") as string) || null;
  const startAt = formData.get("startAt") as string;
  const endAt = (formData.get("endAt") as string) || null;
  const registrationUrl = (formData.get("registrationUrl") as string) || null;
  const onlineUrl = (formData.get("onlineUrl") as string) || null;
  const externalUrl = (formData.get("externalUrl") as string) || null;
  const coverImageUrl = (formData.get("coverImageUrl") as string) || null;
  const capacity = formData.get("capacity") ? Number(formData.get("capacity")) : null;
  const priceMin = formData.get("priceMin") ? Number(formData.get("priceMin")) : null;
  const priceMax = formData.get("priceMax") ? Number(formData.get("priceMax")) : null;
  const tagIds = formData.getAll("tagIds") as string[];
  const topicIds = formData.getAll("topicIds") as string[];

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new Error("Event not found");

  const slug =
    existing.title !== title
      ? await generateUniqueSlug(title, id)
      : existing.slug;

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id },
      data: {
        title,
        slug,
        shortDescription: shortDescription || null,
        descriptionText: descriptionText || null,
        descriptionHtml: descriptionHtml || null,
        cityId,
        eventTypeId,
        locationType: locationType as "PHYSICAL" | "ONLINE" | "HYBRID",
        priceType: priceType as "FREE" | "PAID" | "UNKNOWN",
        language: language as "BG" | "EN" | "MIXED" | null,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : null,
        registrationUrl,
        onlineUrl,
        externalUrl: externalUrl || null,
        coverImageUrl,
        capacity,
        priceMin,
        priceMax,
      },
    });

    await tx.eventTag.deleteMany({ where: { eventId: id } });
    if (tagIds.length > 0) {
      await tx.eventTag.createMany({
        data: tagIds.map((tagId) => ({ eventId: id, tagId })),
      });
    }

    await tx.eventTopic.deleteMany({ where: { eventId: id } });
    if (topicIds.length > 0) {
      await tx.eventTopic.createMany({
        data: topicIds.map((topicId) => ({ eventId: id, topicId })),
      });
    }
  });

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/archive");
  revalidatePath("/sources");
  revalidatePath(`/events/${slug}`);
  redirect("/admin/events");
}

export async function publishEvent(id: string) {
  await requireAdmin();
  const event = await prisma.event.update({
    where: { id },
    data: { status: "PUBLISHED" },
  });
  revalidatePath("/admin/events");
  revalidatePath("/admin/moderation");
  revalidatePath("/events");
  revalidatePath("/archive");
  revalidatePath("/sources");
  revalidatePath(`/events/${event.slug}`);
}

export async function cancelEvent(id: string) {
  await requireAdmin();
  const event = await prisma.event.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/admin/events");
  revalidatePath("/admin/moderation");
  revalidatePath("/events");
  revalidatePath("/archive");
  revalidatePath("/sources");
  revalidatePath(`/events/${event.slug}`);
}

function revalidateEventPaths(slug: string) {
  revalidatePath("/admin/events");
  revalidatePath("/admin/moderation");
  revalidatePath("/events");
  revalidatePath("/archive");
  revalidatePath("/sources");
  revalidatePath(`/events/${slug}`);
}

export async function hideEvent(id: string) {
  await requireAdmin();
  const event = await prisma.event.update({
    where: { id },
    data: { status: "HIDDEN" },
  });
  revalidateEventPaths(event.slug);
}

export async function unhideEvent(id: string) {
  await requireAdmin();
  const event = await prisma.event.update({
    where: { id },
    data: { status: "PUBLISHED" },
  });
  revalidateEventPaths(event.slug);
}

export async function blacklistEvent(id: string) {
  const session = await requireAdmin();
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new Error("Event not found");

  const normalizedTitle = canonicalTitle(existing.title);
  if (!normalizedTitle) throw new Error("Cannot blacklist event with empty title");

  // Session JWT can hold a stale user id after reseed; resolve against DB.
  const createdBy =
    (session.user.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true },
        })
      : null) ??
    (session.user.email
      ? await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        })
      : null);

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id },
      data: { status: "BLACKLISTED" },
    });

    await tx.eventTitleBlacklist.upsert({
      where: { normalizedTitle },
      create: {
        normalizedTitle,
        originalTitle: existing.title,
        eventId: existing.id,
        createdById: createdBy?.id ?? null,
      },
      update: {
        originalTitle: existing.title,
        eventId: existing.id,
        createdById: createdBy?.id ?? null,
      },
    });
  });

  revalidateEventPaths(existing.slug);
}

export async function unblacklistEvent(id: string) {
  await requireAdmin();
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new Error("Event not found");

  const normalizedTitle = canonicalTitle(existing.title);

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id },
      data: { status: "PUBLISHED" },
    });

    if (normalizedTitle) {
      await tx.eventTitleBlacklist.deleteMany({
        where: {
          OR: [{ eventId: id }, { normalizedTitle }],
        },
      });
    } else {
      await tx.eventTitleBlacklist.deleteMany({ where: { eventId: id } });
    }
  });

  revalidateEventPaths(existing.slug);
}
