import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { publishEvent, cancelEvent } from "@/lib/actions/event-actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Управление на събития" };

const statusLabels: Record<string, string> = {
  DRAFT: "Чернова",
  PUBLISHED: "Публикувано",
  CANCELLED: "Отменено",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-yellow-50 text-yellow-700",
  PUBLISHED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-600",
};

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: { city: true, eventType: true },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Събития</h1>
        <Link
          href="/admin/events/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          + Ново събитие
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-gray-500">Няма създадени събития.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Заглавие</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Град</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Дата</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Статус</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {event.title}
                    </Link>
                    <div className="text-xs text-gray-400">{event.eventType.nameBg}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{event.city.nameBg}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(event.startAt).toLocaleDateString("bg-BG")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[event.status]}`}>
                      {statusLabels[event.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="rounded px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                      >
                        Редактирай
                      </Link>
                      {event.status !== "PUBLISHED" && (
                        <form action={publishEvent.bind(null, event.id)}>
                          <button
                            type="submit"
                            className="rounded px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                          >
                            Публикувай
                          </button>
                        </form>
                      )}
                      {event.status !== "CANCELLED" && (
                        <form action={cancelEvent.bind(null, event.id)}>
                          <button
                            type="submit"
                            className="rounded px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Отмени
                          </button>
                        </form>
                      )}
                      {event.status === "PUBLISHED" && (
                        <Link
                          href={`/events/${event.slug}`}
                          target="_blank"
                          className="rounded px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Виж ↗
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
