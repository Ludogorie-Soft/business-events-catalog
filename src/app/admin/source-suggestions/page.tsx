import type { Metadata } from "next";
import Link from "next/link";
import SourceSuggestionStatusActions from "@/components/admin/SourceSuggestionStatusActions";
import type { SourceSuggestionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Предложения за източници" };

const statusLabels: Record<
  SourceSuggestionStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Изчакващо",
    className: "bg-amber-50 text-amber-800",
  },
  REJECTED: {
    label: "Отхвърлено",
    className: "bg-red-50 text-red-700",
  },
  IMPLEMENTED: {
    label: "Добавено",
    className: "bg-green-50 text-green-800",
  },
};

function formatDateTime(value: Date) {
  return new Date(value).toLocaleString("bg-BG", {
    timeZone: "Europe/Sofia",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminSourceSuggestionsPage() {
  const suggestions = await prisma.sourceSuggestion.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const pendingCount = suggestions.filter((s) => s.status === "PENDING").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Предложения за източници
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Предложения от потребители за нови сайтове със събития.
          {pendingCount > 0 ? ` ${pendingCount} изчакващи.` : ""}
        </p>
      </div>

      {suggestions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          <p className="font-medium">Няма предложения</p>
          <p className="mt-1 text-sm">
            Когато потребител изпрати линк от страницата „Източници“, ще се
            появи тук.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Линк
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Коментар
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Дата
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Статус
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suggestions.map((suggestion) => {
                const status = statusLabels[suggestion.status];
                return (
                  <tr key={suggestion.id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <Link
                        href={suggestion.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all font-medium text-blue-600 hover:underline"
                      >
                        {suggestion.url}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {suggestion.notes?.trim() ? suggestion.notes : "—"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                      {formatDateTime(suggestion.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <SourceSuggestionStatusActions
                        suggestionId={suggestion.id}
                        currentStatus={suggestion.status}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
