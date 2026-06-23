"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pullOnlineEvents } from "@/lib/actions/crawl-actions";
import type { CrawlAllResult } from "@/crawlers/types";

function formatResultMessage(result: CrawlAllResult) {
  if (result.processed === 0) {
    return "Няма активни източници за изтегляне. Проверете настройките в Източници.";
  }

  if (result.failed === result.processed) {
    const firstError = result.results.find((item) => item.errorMessage)?.errorMessage;
    return firstError
      ? `Изтеглянето не успя: ${firstError}`
      : "Изтеглянето не успя. Проверете логовете и опитайте отново.";
  }

  const parts = [`Изтеглени са ${result.eventsCreated} нови събития.`];

  if (result.eventsUpdated > 0) {
    parts.push(`Актуализирани са ${result.eventsUpdated} съществуващи събития.`);
  }

  if (result.failed > 0) {
    parts.push(`${result.failed} източник(а) върнаха грешка.`);
  }

  return parts.join(" ");
}

export default function PullEventsButton({
  variant = "card",
}: {
  variant?: "card" | "inline";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handlePull() {
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const result = await pullOnlineEvents();
      const failedCompletely =
        result.processed > 0 && result.failed === result.processed;

      setIsError(failedCompletely);
      setMessage(formatResultMessage(result));
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Възникна грешка при изтеглянето."
      );
    } finally {
      setLoading(false);
    }
  }

  if (variant === "inline") {
    return (
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={handlePull}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Изтегляне..." : "Изтегли събития"}
        </button>
        {message && (
          <p
            className={`max-w-sm rounded-md px-3 py-2 text-right text-sm ${
              isError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">Онлайн събития</h2>
      <p className="mt-2 text-sm text-gray-600">
        Изтеглете нови онлайн бизнес събития от Eventbrite и Startup Council.
      </p>

      <button
        type="button"
        onClick={handlePull}
        disabled={loading}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? "Изтегляне..." : "Изтегли събития"}
      </button>

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
