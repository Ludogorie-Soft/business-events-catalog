import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { AttendanceStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Моите събития" };

const TABS: { status: AttendanceStatus; label: string }[] = [
  { status: "ATTENDING",  label: "Ще присъствам" },
  { status: "INTERESTED", label: "Интересувам се" },
  { status: "CANCELLED",  label: "Отменени"       },
];

type SearchParams = Promise<{ tab?: string }>;

export default async function ProfileEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab } = await searchParams;
  const activeStatus: AttendanceStatus =
    (TABS.find((t) => t.status === tab?.toUpperCase())?.status) ?? "ATTENDING";

  const session = await auth();
  const userId = session!.user.id;

  const records = await prisma.eventAttendance.findMany({
    where: { userId, status: activeStatus },
    include: {
      event: {
        include: {
          city: true,
          eventType: true,
        },
      },
    },
    orderBy: { event: { startAt: "asc" } },
  });

  return (
    <div>
      {/* Status tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {TABS.map(({ status, label }) => (
          <Link
            key={status}
            href={`/profile/events?tab=${status.toLowerCase()}`}
            className={[
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              activeStatus === status
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Events list */}
      {records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          <p className="font-medium">Няма записани събития</p>
          <p className="mt-1 text-sm">
            Разгледайте{" "}
            <Link href="/events" className="text-blue-600 hover:underline">
              всички събития
            </Link>{" "}
            и маркирайте участие.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(({ event }) => {
            const dateStr = new Date(event.startAt).toLocaleDateString("bg-BG", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            const timeStr = new Date(event.startAt).toLocaleTimeString("bg-BG", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900 group-hover:text-blue-600">
                    {event.title}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {dateStr} · {timeStr} · {event.city.nameBg}
                  </p>
                </div>
                <div className="ml-4 shrink-0">
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {event.eventType.nameBg}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
