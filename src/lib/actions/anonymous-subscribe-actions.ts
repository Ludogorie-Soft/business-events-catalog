"use server";

import { createEmailVerificationToken, getEmailVerificationExpiry } from "@/lib/email-verification";
import { sendSubscribeConfirmEmail } from "@/lib/email/send-subscribe-confirm";
import { prisma } from "@/lib/prisma";
import type { Language, PriceType } from "@/generated/prisma/client";

export type AnonymousSubscribeState = {
  ok: boolean;
  error?: string;
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseOptionalEnum<T extends string>(value: FormDataEntryValue | null): T | null {
  return value && typeof value === "string" && value.length > 0 ? (value as T) : null;
}

function parseOptionalId(value: FormDataEntryValue | null) {
  return value && typeof value === "string" && value.length > 0 ? value : null;
}

function sameOptional(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? null) === (b ?? null);
}

async function sendConfirmOrError(
  user: { email: string; name?: string | null },
  subscriptionName: string,
  token: string
): Promise<AnonymousSubscribeState | null> {
  const emailResult = await sendSubscribeConfirmEmail(user, subscriptionName, token);
  if (!emailResult.ok && !("skipped" in emailResult && emailResult.skipped)) {
    console.error("[email] Failed to send subscribe confirm:", emailResult);
    return {
      ok: false,
      error: "Имейлът за потвърждение не беше изпратен. Опитайте отново.",
    };
  }
  return null;
}

export async function anonymousSubscribe(
  _prev: AnonymousSubscribeState,
  formData: FormData
): Promise<AnonymousSubscribeState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const cityId = parseOptionalId(formData.get("cityId"));
  const includeOnline = formData.get("includeOnline") === "on";
  const topicId = parseOptionalId(formData.get("topicId"));
  const eventTypeId = parseOptionalId(formData.get("eventTypeId"));
  const priceType = parseOptionalEnum<PriceType>(formData.get("priceType"));
  const language = parseOptionalEnum<Language>(formData.get("language"));

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Моля, въведете валиден имейл адрес." };
  }
  if (!cityId) {
    return { ok: false, error: "Моля, изберете град." };
  }
  if (priceType && priceType !== "FREE" && priceType !== "PAID") {
    return { ok: false, error: "Невалидна цена." };
  }
  if (language && language !== "BG" && language !== "EN" && language !== "MIXED") {
    return { ok: false, error: "Невалиден език." };
  }

  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city || city.slug === "online") {
    return { ok: false, error: "Моля, изберете валиден град." };
  }

  let onlineCityId: string | null = null;
  if (includeOnline) {
    const onlineCity = await prisma.city.findUnique({ where: { slug: "online" } });
    if (!onlineCity) {
      return { ok: false, error: "Онлайн градът не е конфигуриран." };
    }
    onlineCityId = onlineCity.id;
  }

  if (topicId) {
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) return { ok: false, error: "Невалидна тема." };
  }
  if (eventTypeId) {
    const eventType = await prisma.eventType.findUnique({ where: { id: eventTypeId } });
    if (!eventType) return { ok: false, error: "Невалиден вид събитие." };
  }

  const nameParts = [city.nameBg];
  if (includeOnline) nameParts.push("онлайн");
  const subscriptionName = nameParts.join(" + ");

  const cityIds = onlineCityId ? [cityId, onlineCityId] : [cityId];
  const confirmToken = createEmailVerificationToken();
  const confirmTokenExpiresAt = getEmailVerificationExpiry();

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash: null,
    },
    update: {},
  });

  const pending = await prisma.subscription.findMany({
    where: {
      userId: user.id,
      active: false,
      confirmToken: { not: null },
      frequency: "WEEKLY",
      priceType: priceType ?? null,
      language: language ?? null,
      locationType: null,
    },
    include: {
      cities: true,
      topics: true,
      eventTypes: true,
    },
  });

  const identical = pending.find((sub) => {
    const subCityIds = sub.cities.map((c) => c.cityId).sort();
    const wantedCityIds = [...cityIds].sort();
    if (subCityIds.join(",") !== wantedCityIds.join(",")) return false;
    const subTopicId = sub.topics[0]?.topicId ?? null;
    const subEventTypeId = sub.eventTypes[0]?.eventTypeId ?? null;
    return (
      sameOptional(subTopicId, topicId) &&
      sameOptional(subEventTypeId, eventTypeId) &&
      sub.topics.length <= 1 &&
      sub.eventTypes.length <= 1
    );
  });

  if (identical) {
    await prisma.subscription.update({
      where: { id: identical.id },
      data: {
        confirmToken,
        confirmTokenExpiresAt,
        name: subscriptionName,
      },
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          name: subscriptionName,
          frequency: "WEEKLY",
          active: false,
          priceType: priceType ?? null,
          language: language ?? null,
          confirmToken,
          confirmTokenExpiresAt,
        },
      });

      await tx.subscriptionCity.createMany({
        data: cityIds.map((id) => ({ subscriptionId: subscription.id, cityId: id })),
      });

      if (topicId) {
        await tx.subscriptionTopic.create({
          data: { subscriptionId: subscription.id, topicId },
        });
      }
      if (eventTypeId) {
        await tx.subscriptionEventType.create({
          data: { subscriptionId: subscription.id, eventTypeId },
        });
      }
    });
  }

  const sendError = await sendConfirmOrError(user, subscriptionName, confirmToken);
  if (sendError) {
    return {
      ...sendError,
      error:
        "Абонаментът е записан, но имейлът за потвърждение не беше изпратен. Опитайте отново.",
    };
  }

  return {
    ok: true,
    message: "Проверете имейла си за потвърждение на абонамента.",
  };
}

/** Resend confirmation for all pending (unconfirmed) subscriptions for an email. */
export async function resendSubscribeConfirm(
  _prev: AnonymousSubscribeState,
  formData: FormData
): Promise<AnonymousSubscribeState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Моля, въведете валиден имейл адрес." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return {
      ok: false,
      error: "Няма чакащ абонамент за този имейл. Можете да се абонирате от формата по-горе.",
    };
  }

  const pending = await prisma.subscription.findMany({
    where: {
      userId: user.id,
      active: false,
      confirmToken: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (pending.length === 0) {
    return {
      ok: false,
      error:
        "Няма чакащ абонамент за потвърждение. Ако вече сте потвърдили, ще получавате дайджестите автоматично.",
    };
  }

  const confirmTokenExpiresAt = getEmailVerificationExpiry();
  let sentCount = 0;

  for (const subscription of pending) {
    const confirmToken = createEmailVerificationToken();
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { confirmToken, confirmTokenExpiresAt },
    });

    const sendError = await sendConfirmOrError(user, subscription.name, confirmToken);
    if (sendError) {
      return sendError;
    }
    sentCount += 1;
  }

  return {
    ok: true,
    message:
      sentCount === 1
        ? "Изпратихме отново имейла за потвърждение. Проверете входящата си кутия."
        : `Изпратихме отново ${sentCount} имейла за потвърждение. Проверете входящата си кутия.`,
  };
}
