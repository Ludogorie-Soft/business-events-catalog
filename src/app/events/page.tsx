import { Suspense } from "react";
import type { Metadata } from "next";
import EventCard from "@/components/EventCard";
import EventFilters from "@/components/EventFilters";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getEvents, getFilterOptions, sortEventsByUserAttendance } from "@/lib/events";
import type { AttendanceStatus, LocationType, PriceType, Language } from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Всички събития",
  description: "Разгледайте предстоящите бизнес събития в България.",
};

type SearchParams = Promise<{
  city?: string;
  type?: string;
  topic?: string;
  tag?: string;
  price?: string;
  location?: string;
  language?: string;
  from?: string;
  to?: string;
}>;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const [session, { cities, eventTypes, topics, tags }, events] = await Promise.all([
    auth(),
    getFilterOptions(),
    getEvents({
      citySlug: sp.city,
      eventTypeSlug: sp.type,
      topicSlug: sp.topic,
      tagSlug: sp.tag,
      priceType: sp.price as PriceType | undefined,
      locationType: sp.location as LocationType | undefined,
      language: sp.language as Language | undefined,
      dateFrom: sp.from,
      dateTo: sp.to,
    }),
  ]);

  const userId = session?.user?.id;
  const attendanceRecords = userId
    ? await prisma.eventAttendance.findMany({
        where: { userId, status: { in: ["ATTENDING", "INTERESTED"] } },
        select: { eventId: true, status: true },
      })
    : [];

  const attendanceByEventId = new Map<string, AttendanceStatus>(
    attendanceRecords.map(({ eventId, status }) => [eventId, status])
  );

  const sortedEvents = sortEventsByUserAttendance(events, attendanceByEventId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Бизнес събития</h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filters sidebar */}
        <div className="w-full shrink-0 lg:w-60">
          <Suspense>
            <EventFilters
              cities={cities}
              eventTypes={eventTypes}
              topics={topics}
              tags={tags}
            />
          </Suspense>
        </div>

        {/* Events grid */}
        <div className="flex-1">
          {sortedEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-16 text-center text-gray-500">
              <p className="text-lg font-medium">Няма намерени събития</p>
              <p className="mt-1 text-sm">Опитайте с различни филтри.</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-500">
                {sortedEvents.length}{" "}
                {sortedEvents.length === 1 ? "събитие" : "събития"}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sortedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    attendanceStatus={attendanceByEventId.get(event.id) ?? null}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
