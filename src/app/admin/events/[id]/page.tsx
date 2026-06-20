import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import EventForm from "@/components/admin/EventForm";
import { getFilterOptions } from "@/lib/events";
import { updateEvent, publishEvent, cancelEvent } from "@/lib/actions/event-actions";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Редактирай събитие" };

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const [event, { cities, eventTypes, tags }] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { tags: true } }),
    getFilterOptions(),
  ]);

  if (!event) notFound();

  const selectedTagIds = event.tags.map((et) => et.tagId);
  const updateWithId = updateEvent.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/events" className="text-sm text-gray-500 hover:text-gray-800">
            ← Назад
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Редактирай събитие</h1>
        </div>

        {/* Quick status actions */}
        <div className="flex gap-2">
          {event.status !== "PUBLISHED" && (
            <form action={publishEvent.bind(null, id)}>
              <button
                type="submit"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
              >
                Публикувай
              </button>
            </form>
          )}
          {event.status !== "CANCELLED" && (
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
          {event.status === "DRAFT" ? "Чернова" : event.status === "PUBLISHED" ? "Публикувано" : "Отменено"}
        </span>
        {" · "}Slug: <code className="text-xs bg-gray-200 px-1 rounded">{event.slug}</code>
      </div>

      <EventForm
        cities={cities}
        eventTypes={eventTypes}
        tags={tags}
        action={updateWithId}
        defaultValues={event}
        selectedTagIds={selectedTagIds}
        submitLabel="Запази промените"
        showPublishToggle={false}
      />
    </div>
  );
}
