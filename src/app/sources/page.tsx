import type { Metadata } from "next";
import Link from "next/link";
import SourceSuggestionForm from "@/components/SourceSuggestionForm";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Източници",
  description:
    "Уебсайтове, от които събираме предстоящи бизнес събития в България.",
};

function upcomingEventsWhere(now: Date) {
  return {
    status: "PUBLISHED" as const,
    OR: [
      { endAt: { gte: now } },
      { AND: [{ endAt: null }, { startAt: { gte: now } }] },
    ],
  };
}

export default async function SourcesPage() {
  const now = new Date();
  const sources = await prisma.source.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          events: { where: upcomingEventsWhere(now) },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/events" className="hover:text-gray-800">
          Предстоящи събития
        </Link>
        <span className="mx-2">›</span>
        <span className="text-gray-800">Източници</span>
      </nav>

      <h1 className="mb-2 text-3xl font-bold text-gray-900">Източници</h1>
      <p className="mb-8 max-w-2xl text-gray-600">
        Уебсайтове, от които автоматично събираме бизнес събития. Броят показва
        предстоящите публикувани събития в каталога от всеки източник.
      </p>

      {sources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-16 text-center text-gray-500">
          <p className="text-lg font-medium">Няма активни източници</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Източник
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Предстоящи събития
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">
                  Сайт
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((source) => (
                <tr key={source.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-900">{source.name}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    <span className="font-semibold text-gray-900">
                      {source._count.events}
                    </span>{" "}
                    {source._count.events === 1 ? "събитие" : "събития"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {source.websiteUrl ? (
                      <Link
                        href={source.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Отвори сайта ↗
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SourceSuggestionForm />
    </div>
  );
}
