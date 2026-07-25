import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import EventForm from "@/components/admin/EventForm";
import { getFilterOptions } from "@/lib/events";
import {
  updateEvent,
  publishEvent,
  cancelEvent,
  hideEvent,
  unhideEvent,
  blacklistEvent,
  unblacklistEvent,
} from "@/lib/actions/event-actions";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Редактирай събитие" };

const statusLabels: Record<string, string> = {
  DRAFT: "Чернова",
  PUBLISHED: "Публикувано",
  CANCELLED: "Отменено",
  HIDDEN: "Скрито",
  BLACKLISTED: "Черен списък",
};

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const [event, { cities, eventTypes, topics, tags }] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: { tags: true, topics: true },
    }),
    getFilterOptions(),
  ]);

  if (!event) notFound();

  const selectedTagIds = event.tags.map((et) => et.tagId);
  const selectedTopicIds = event.topics.map((et) => et.topicId);
  const updateWithId = updateEvent.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/events" className="text-sm text-gray-500 hover:text-gray-800">
            ← Назад
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Редактирай събитие</h1>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {event.status !== "PUBLISHED" && event.status !== "BLACKLISTED" && (
            <form action={publishEvent.bind(null, id)}>
              <button
                type="submit"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
              >
                Публикувай
              </button>
            </form>
          )}
          {event.status === "HIDDEN" && (
            <form action={unhideEvent.bind(null, id)}>
              <button
                type="submit"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
              >
                Покажи
              </button>
            </form>
          )}
          {event.status === "BLACKLISTED" && (
            <form action={unblacklistEvent.bind(null, id)}>
              <button
                type="submit"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
              >
                Премахни от списъка
              </button>
            </form>
          )}
          {event.status !== "HIDDEN" && event.status !== "BLACKLISTED" && (
            <form action={hideEvent.bind(null, id)}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Скрий
              </button>
            </form>
          )}
          {event.status !== "BLACKLISTED" && (
            <form action={blacklistEvent.bind(null, id)}>
              <button
                type="submit"
                className="rounded-lg border border-purple-300 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
              >
                Черен списък
              </button>
            </form>
          )}
          {event.status !== "CANCELLED" && event.status !== "BLACKLISTED" && (
            <form action={cancelEvent.bind(null, id)}>
              <button
                type="submit"
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                Отмени
              </button>
            </form>
          )}
          {event.status === "PUBLISHED" && (
            <Link
              href={`/events/${event.slug}`}
              target="_blank"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Виж публично ↗
            </Link>
          )}
        </div>
      </div>

      <div className="mb-5 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Статус:{" "}
        <span className="font-semibold">
          {statusLabels[event.status] ?? event.status}
        </span>
        {" · "}Slug: <code className="text-xs bg-gray-200 px-1 rounded">{event.slug}</code>
        {(event.status === "HIDDEN" || event.status === "BLACKLISTED") && (
          <>
            {" · "}
            <Link href="/admin/moderation" className="text-blue-600 hover:underline">
              Виж в Модерация
            </Link>
          </>
        )}
      </div>

      <EventForm
        cities={cities}
        eventTypes={eventTypes}
        topics={topics}
        tags={tags}
        action={updateWithId}
        defaultValues={event}
        selectedTopicIds={selectedTopicIds}
        selectedTagIds={selectedTagIds}
        submitLabel="Запази промените"
        showPublishToggle={false}
      />
    </div>
  );
}
