"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importEventFromUrl } from "@/lib/actions/crawl-actions";

type ManualSourceOption = {
  sourceKey: string;
  label: string;
  placeholder: string;
};

function formatResultMessage(
  eventsCreated: number,
  eventsUpdated: number,
  error?: string
) {
  if (error) return error;

  if (eventsCreated > 0 && eventsUpdated > 0) {
    return `Добавено е ${eventsCreated} ново събитие и актуализирано е ${eventsUpdated} съществуващо.`;
  }

  if (eventsCreated > 0) {
    return `Добавено е ${eventsCreated} ново събитие в каталога.`;
  }

  if (eventsUpdated > 0) {
    return `Актуализирано е съществуващо събитие в каталога.`;
  }

  return "Събитието бе обработено успешно.";
}

export default function ManualEventCrawlForm({
  sources,
}: {
  sources: ManualSourceOption[];
}) {
  const router = useRouter();
  const [sourceKey, setSourceKey] = useState(sources[0]?.sourceKey ?? "");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const selectedSource =
    sources.find((source) => source.sourceKey === sourceKey) ?? sources[0];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const result = await importEventFromUrl(sourceKey, url);

      if (result.status === "failed") {
        setIsError(true);
        setMessage(result.errorMessage ?? "Импортът не успя.");
        return;
      }

      setMessage(
        formatResultMessage(result.eventsCreated, result.eventsUpdated)
      );
      setUrl("");
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Възникна грешка при импорта."
      );
    } finally {
      setLoading(false);
    }
  }

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Импорт на събитие по URL
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Изберете източник и поставете директен URL към страница на събитие.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-end">
          <div>
            <label
              htmlFor="manual-crawl-source"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Уебсайт
            </label>
            <select
              id="manual-crawl-source"
              value={sourceKey}
              onChange={(event) => setSourceKey(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {sources.map((source) => (
                <option key={source.sourceKey} value={source.sourceKey}>
                  {source.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="manual-crawl-url"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              URL на събитие
            </label>
            <input
              id="manual-crawl-url"
              type="url"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={selectedSource?.placeholder}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Импорт..." : "Импортирай събитие"}
          </button>
        </div>
      </form>

      {message && (
        <p
          className={`mt-4 rounded-md px-4 py-3 text-sm ${
            isError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
