import Link from "next/link";
import type { Metadata } from "next";
import {
  unhideEvent,
  unblacklistEvent,
} from "@/lib/actions/event-actions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Модерация" };

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

const tabs = [
  { id: "hidden", label: "Скрити", status: "HIDDEN" as const },
  { id: "blacklisted", label: "Черен списък", status: "BLACKLISTED" as const },
];

export default async function AdminModerationPage({ searchParams }: Props) {
  const params = await searchParams;
  const activeTab =
    tabs.find((tab) => tab.id === params.tab)?.id ?? "hidden";
  const activeStatus =
    tabs.find((tab) => tab.id === activeTab)?.status ?? "HIDDEN";

  const [events, hiddenCount, blacklistedCount] = await Promise.all([
    prisma.event.findMany({
      where: { status: activeStatus },
      orderBy: { updatedAt: "desc" },
      include: { city: true, source: true, eventType: true },
    }),
    prisma.event.count({ where: { status: "HIDDEN" } }),
    prisma.event.count({ where: { status: "BLACKLISTED" } }),
  ]);

  const counts: Record<string, number> = {
    hidden: hiddenCount,
    blacklisted: blacklistedCount,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Модерация</h1>
        <p className="mt-1 text-sm text-gray-500">
          Скрити събития не се показват публично. Събития в черния списък също
          се пропускат при бъдещи crawls при същото заглавие.
        </p>
      </div>

      <div className="mb-4 flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Link
              key={tab.id}
              href={`/admin/moderation?tab=${tab.id}`}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {counts[tab.id]}
              </span>
            </Link>
          );
        })}
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          <p className="font-medium">
            {activeTab === "hidden"
              ? "Няма скрити събития"
              : "Няма събития в черния списък"}
          </p>
          <p className="mt-1 text-sm">
            Можете да скриете или блокирате събитие от списъка със събития.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Заглавие
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Източник
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Дата
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">
                  Действия
                </th>
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
                    <div className="text-xs text-gray-400">
                      {event.city.nameBg} · {event.eventType.nameBg}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {event.source?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(event.startAt).toLocaleDateString("bg-BG")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="rounded px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                      >
                        Редактирай
                      </Link>
                      {event.status === "HIDDEN" && (
                        <form action={unhideEvent.bind(null, event.id)}>
                          <button
                            type="submit"
                            className="rounded px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                          >
                            Покажи
                          </button>
                        </form>
                      )}
                      {event.status === "BLACKLISTED" && (
                        <form action={unblacklistEvent.bind(null, event.id)}>
                          <button
                            type="submit"
                            className="rounded px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                          >
                            Премахни от списъка
                          </button>
                        </form>
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
