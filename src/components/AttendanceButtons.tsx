"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { setAttendance, removeAttendance } from "@/lib/actions/attendance-actions";
import type { AttendanceStatus } from "@/generated/prisma/client";

type Props = {
  eventId: string;
  eventSlug: string;
  userId: string | null;
  initialStatus: AttendanceStatus | null;
};

const BUTTONS: { status: AttendanceStatus; label: string; icon: string }[] = [
  { status: "INTERESTED", label: "Интересувам се", icon: "⭐" },
  { status: "ATTENDING",  label: "Ще присъствам",  icon: "✅" },
  { status: "CANCELLED",  label: "Не мога",         icon: "✗"  },
];

export default function AttendanceButtons({
  eventId,
  eventSlug,
  userId,
  initialStatus,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState(initialStatus);

  if (!userId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 text-center">
        <Link href="/auth/login" className="font-semibold text-blue-600 hover:underline">
          Влезте в профила си
        </Link>{" "}
        за да маркирате участие в събитието.
      </div>
    );
  }

  function handleClick(status: AttendanceStatus) {
    if (pending) return;
    const next = optimisticStatus === status ? null : status;
    setOptimisticStatus(next);

    startTransition(async () => {
      if (next === null) {
        await removeAttendance(eventId, eventSlug);
      } else {
        await setAttendance(eventId, eventSlug, status);
      }
    });
  }

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-gray-700">Вашето участие:</p>
      <div className="flex flex-wrap gap-2">
        {BUTTONS.map(({ status, label, icon }) => {
          const active = optimisticStatus === status;
          return (
            <button
              key={status}
              onClick={() => handleClick(status)}
              disabled={pending}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
                active
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700",
              ].join(" ")}
            >
              <span>{icon}</span>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
