import type { Metadata } from "next";
import AnonymousSubscribeForm from "@/components/AnonymousSubscribeForm";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Абонамент за събития",
  description:
    "Абонирайте се за седмичен имейл със бизнес събития по град — без регистрация.",
};

export default async function SubscribePage() {
  const [cities, topics, eventTypes] = await Promise.all([
    prisma.city.findMany({
      where: { slug: { not: "online" } },
      orderBy: { nameBg: "asc" },
    }),
    prisma.topic.findMany({ orderBy: { nameBg: "asc" } }),
    prisma.eventType.findMany({ orderBy: { nameBg: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Абонамент за събития</h1>
      <p className="mb-8 text-gray-600">
        Получавайте седмичен имейл с подходящи бизнес събития. Не е нужна регистрация —
        само имейл и град.
      </p>

      <AnonymousSubscribeForm cities={cities} topics={topics} eventTypes={eventTypes} />
    </div>
  );
}
