import type { Metadata } from "next";
import Link from "next/link";
import ManualEventCrawlForm from "@/components/admin/ManualEventCrawlForm";
import PullEventsButton from "@/components/admin/PullEventsButton";
import SourceRowActions from "@/components/admin/SourceRowActions";
import { manualCrawlSources } from "@/crawlers/manual-crawlers";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Източници" };

function formatDateTime(value: Date | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleString("bg-BG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminSourcesPage() {
  const sources = await prisma.source.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { events: true } },
    },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Източници</h1>
          <p className="mt-1 text-sm text-gray-500">
            Онлайн източници за автоматично изтегляне на бизнес събития.
          </p>
        </div>
        <PullEventsButton variant="inline" />
      </div>

      <ManualEventCrawlForm sources={manualCrawlSources} />

      {sources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          <p className="font-medium">Няма конфигурирани източници</p>
          <p className="mt-1 text-sm">Стартирайте `npm run db:seed`, за да добавите източниците.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Източник</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Статус</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Последно изтегляне
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Последна проверка
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Намерени / в каталога
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Последна грешка
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((source) => (
                <tr key={source.id} className="align-top hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-900">{source.name}</p>
                    <p className="text-xs text-gray-400">{source.sourceKey}</p>
                    {source.websiteUrl && (
                      <Link
                        href={source.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                      >
                        Отвори сайта ↗
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        source.active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {source.active ? "Активен" : "Неактивен"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {formatDateTime(source.lastSuccessAt)}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {formatDateTime(source.lastCheckedAt)}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {source.lastEventsFoundCount ?? "—"} / {source._count.events}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {source.lastError ? (
                      <span className="text-red-600">{source.lastError}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <SourceRowActions
                      sourceId={source.id}
                      sourceKey={source.sourceKey}
                      active={source.active}
                    />
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
