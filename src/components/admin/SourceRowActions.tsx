"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pullSourceEvents } from "@/lib/actions/crawl-actions";
import { toggleSourceActive } from "@/lib/actions/source-actions";

type Props = {
  sourceId: string;
  sourceKey: string;
  active: boolean;
};

function formatPullMessage(eventsCreated: number, eventsUpdated: number, error?: string) {
  if (error) return error;
  if (eventsCreated === 0 && eventsUpdated === 0) {
    return "Няма нови събития.";
  }
  const parts: string[] = [];
  if (eventsCreated > 0) parts.push(`${eventsCreated} нови`);
  if (eventsUpdated > 0) parts.push(`${eventsUpdated} актуализирани`);
  return parts.join(", ");
}

export default function SourceRowActions({ sourceId, sourceKey, active }: Props) {
  const router = useRouter();
  const [pullLoading, setPullLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handlePull() {
    setPullLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const result = await pullSourceEvents(sourceKey);
      const sourceResult = result.results[0];

      if (!sourceResult || sourceResult.status === "failed") {
        setIsError(true);
        setMessage(sourceResult?.errorMessage ?? "Изтеглянето не успя.");
        return;
      }

      setMessage(
        formatPullMessage(sourceResult.eventsCreated, sourceResult.eventsUpdated)
      );
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Възникна грешка при изтеглянето."
      );
    } finally {
      setPullLoading(false);
    }
  }

  async function handleToggle() {
    setToggleLoading(true);
    setMessage("");

    try {
      await toggleSourceActive(sourceId);
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Възникна грешка."
      );
    } finally {
      setToggleLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={handlePull}
          disabled={pullLoading || !active}
          className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50"
        >
          {pullLoading ? "Изтегляне..." : "Изтегли"}
        </button>
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggleLoading}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {toggleLoading ? "..." : active ? "Спри" : "Активирай"}
        </button>
      </div>
      {message && (
        <p
          className={`text-right text-xs ${
            isError ? "text-red-600" : "text-green-700"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
