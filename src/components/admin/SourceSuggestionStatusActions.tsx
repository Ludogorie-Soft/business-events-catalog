"use client";

import { useTransition } from "react";
import type { SourceSuggestionStatus } from "@/generated/prisma/client";
import { updateSourceSuggestionStatus } from "@/lib/actions/source-suggestion-actions";

type Props = {
  suggestionId: string;
  currentStatus: SourceSuggestionStatus;
};

const actions: {
  status: SourceSuggestionStatus;
  label: string;
  className: string;
}[] = [
  {
    status: "PENDING",
    label: "Изчакващо",
    className:
      "border-amber-200 text-amber-800 hover:bg-amber-50 disabled:opacity-50",
  },
  {
    status: "IMPLEMENTED",
    label: "Добавено",
    className:
      "border-green-200 text-green-800 hover:bg-green-50 disabled:opacity-50",
  },
  {
    status: "REJECTED",
    label: "Отхвърлено",
    className:
      "border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50",
  },
];

export default function SourceSuggestionStatusActions({
  suggestionId,
  currentStatus,
}: Props) {
  const [pending, startTransition] = useTransition();

  function setStatus(status: SourceSuggestionStatus) {
    if (status === currentStatus) return;
    startTransition(async () => {
      await updateSourceSuggestionStatus(suggestionId, status);
    });
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {actions.map(({ status, label, className }) => (
        <button
          key={status}
          type="button"
          disabled={pending || currentStatus === status}
          onClick={() => setStatus(status)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${className} ${
            currentStatus === status ? "ring-1 ring-current" : ""
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
