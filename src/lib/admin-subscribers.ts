import type { Prisma } from "@/generated/prisma/client";
import type { Language, PriceType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const subscriptionInclude = {
  user: { select: { id: true, email: true, name: true, passwordHash: true } },
  cities: { include: { city: true } },
  eventTypes: { include: { eventType: true } },
  topics: { include: { topic: true } },
  tags: { include: { tag: true } },
} as const;

export type AdminSubscriberStatus = "active" | "pending" | "inactive";
export type AdminSubscriberSort =
  | "createdAt_desc"
  | "createdAt_asc"
  | "email_asc"
  | "email_desc";

export type AdminSubscriberFilters = {
  city?: string;
  online?: "yes" | "no";
  topic?: string;
  price?: PriceType;
  type?: string;
  language?: Language;
  status?: AdminSubscriberStatus;
  sort?: AdminSubscriberSort;
};

export const frequencyLabels = {
  DAILY: "Ежедневно",
  WEEKLY: "Седмично",
} as const;

export const priceLabels = {
  FREE: "Безплатно",
  PAID: "Платено",
} as const;

export const locationLabels = {
  PHYSICAL: "На живо",
  ONLINE: "Онлайн",
  HYBRID: "Хибридно",
} as const;

export const languageLabels = {
  BG: "Български",
  EN: "Английски",
  MIXED: "Смесен",
} as const;

export const statusLabels = {
  active: "Активен",
  pending: "Чака потвърждение",
  inactive: "Неактивен",
} as const;

function firstParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

export function parseAdminSubscriberFilters(
  sp: Record<string, string | string[] | undefined>
): AdminSubscriberFilters {
  const city = firstParam(sp.city);
  const onlineRaw = firstParam(sp.online);
  const topic = firstParam(sp.topic);
  const priceRaw = firstParam(sp.price);
  const type = firstParam(sp.type);
  const languageRaw = firstParam(sp.language);
  const statusRaw = firstParam(sp.status);
  const sortRaw = firstParam(sp.sort);

  const online =
    onlineRaw === "yes" || onlineRaw === "no" ? onlineRaw : undefined;
  const price =
    priceRaw === "FREE" || priceRaw === "PAID" ? priceRaw : undefined;
  const language =
    languageRaw === "BG" || languageRaw === "EN" || languageRaw === "MIXED"
      ? languageRaw
      : undefined;
  const status =
    statusRaw === "active" ||
    statusRaw === "pending" ||
    statusRaw === "inactive"
      ? statusRaw
      : undefined;
  const sort: AdminSubscriberSort =
    sortRaw === "createdAt_asc" ||
    sortRaw === "email_asc" ||
    sortRaw === "email_desc" ||
    sortRaw === "createdAt_desc"
      ? sortRaw
      : "createdAt_desc";

  return {
    city: city || undefined,
    online,
    topic: topic || undefined,
    price,
    type: type || undefined,
    language,
    status,
    sort,
  };
}

export function adminSubscriberFiltersToSearchParams(
  filters: AdminSubscriberFilters
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.online) params.set("online", filters.online);
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.price) params.set("price", filters.price);
  if (filters.type) params.set("type", filters.type);
  if (filters.language) params.set("language", filters.language);
  if (filters.status) params.set("status", filters.status);
  if (filters.sort && filters.sort !== "createdAt_desc") {
    params.set("sort", filters.sort);
  }
  return params;
}

function buildWhere(
  filters: AdminSubscriberFilters
): Prisma.SubscriptionWhereInput {
  const where: Prisma.SubscriptionWhereInput = {};
  const and: Prisma.SubscriptionWhereInput[] = [];

  if (filters.city) {
    and.push({ cities: { some: { city: { slug: filters.city } } } });
  }
  if (filters.online === "yes") {
    and.push({ cities: { some: { city: { slug: "online" } } } });
  } else if (filters.online === "no") {
    and.push({ cities: { none: { city: { slug: "online" } } } });
  }
  if (filters.topic) {
    and.push({ topics: { some: { topic: { slug: filters.topic } } } });
  }
  if (filters.type) {
    and.push({ eventTypes: { some: { eventType: { slug: filters.type } } } });
  }
  if (filters.price) {
    where.priceType = filters.price;
  }
  if (filters.language) {
    where.language = filters.language;
  }
  if (filters.status === "active") {
    where.active = true;
  } else if (filters.status === "pending") {
    where.active = false;
    where.confirmToken = { not: null };
  } else if (filters.status === "inactive") {
    where.active = false;
    where.confirmToken = null;
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return where;
}

function buildOrderBy(
  sort: AdminSubscriberSort = "createdAt_desc"
): Prisma.SubscriptionOrderByWithRelationInput[] {
  switch (sort) {
    case "createdAt_asc":
      return [{ createdAt: "asc" }];
    case "email_asc":
      return [{ user: { email: "asc" } }, { createdAt: "desc" }];
    case "email_desc":
      return [{ user: { email: "desc" } }, { createdAt: "desc" }];
    case "createdAt_desc":
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function getAdminSubscriptions(filters: AdminSubscriberFilters = {}) {
  return prisma.subscription.findMany({
    where: buildWhere(filters),
    orderBy: buildOrderBy(filters.sort),
    include: subscriptionInclude,
  });
}

export type AdminSubscription = Awaited<
  ReturnType<typeof getAdminSubscriptions>
>[number];

export type AdminSubscriberRow = {
  email: string;
  name: string;
  subscriptionName: string;
  accountType: string;
  status: string;
  cities: string;
  online: string;
  topics: string;
  price: string;
  eventTypes: string;
  language: string;
  locationType: string;
  tags: string;
  maxPrice: string;
  frequency: string;
  createdAt: string;
};

export function formatAdminDateTime(value: Date) {
  return new Date(value).toLocaleString("bg-BG", {
    timeZone: "Europe/Sofia",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getSubscriptionStatus(
  subscription: Pick<AdminSubscription, "active" | "confirmToken">
): AdminSubscriberStatus {
  if (subscription.active) return "active";
  if (subscription.confirmToken != null) return "pending";
  return "inactive";
}

export function toAdminSubscriberRow(
  subscription: AdminSubscription
): AdminSubscriberRow {
  const cities = subscription.cities.map(({ city }) => city);
  const physicalCities = cities.filter((c) => c.slug !== "online");
  const includesOnline = cities.some((c) => c.slug === "online");
  const status = getSubscriptionStatus(subscription);

  return {
    email: subscription.user.email,
    name: subscription.user.name ?? "",
    subscriptionName: subscription.name,
    accountType: subscription.user.passwordHash == null ? "без регистрация" : "регистриран",
    status: statusLabels[status],
    cities: physicalCities.map((c) => c.nameBg).join(", "),
    online: includesOnline ? "Да" : "Не",
    topics: subscription.topics.map(({ topic }) => topic.nameBg).join(", "),
    price:
      subscription.priceType === "FREE" || subscription.priceType === "PAID"
        ? priceLabels[subscription.priceType]
        : "",
    eventTypes: subscription.eventTypes
      .map(({ eventType }) => eventType.nameBg)
      .join(", "),
    language: subscription.language
      ? languageLabels[subscription.language]
      : "",
    locationType: subscription.locationType
      ? locationLabels[subscription.locationType]
      : "",
    tags: subscription.tags.map(({ tag }) => `#${tag.nameEn}`).join(", "),
    maxPrice:
      subscription.maxPrice != null
        ? `${Number(subscription.maxPrice).toFixed(0)} EUR`
        : "",
    frequency: frequencyLabels[subscription.frequency],
    createdAt: formatAdminDateTime(subscription.createdAt),
  };
}

export const excelHeaders = [
  { key: "email", header: "Имейл" },
  { key: "name", header: "Име" },
  { key: "subscriptionName", header: "Абонамент" },
  { key: "accountType", header: "Тип акаунт" },
  { key: "status", header: "Статус" },
  { key: "cities", header: "Град" },
  { key: "online", header: "Онлайн" },
  { key: "topics", header: "Тема" },
  { key: "price", header: "Цена" },
  { key: "eventTypes", header: "Вид събитие" },
  { key: "language", header: "Език" },
  { key: "locationType", header: "Формат" },
  { key: "tags", header: "Тагове" },
  { key: "maxPrice", header: "Макс. цена" },
  { key: "frequency", header: "Честота" },
  { key: "createdAt", header: "Създаден" },
] as const;
