import type { Metadata } from "next";
import Link from "next/link";
import EventCard from "@/components/EventCard";
import { getEvents } from "@/lib/events";

export const metadata: Metadata = {
  title: "Архив",
  description: "Минали бизнес събития в България.",
};

export default async function ArchivePage() {
  const events = await getEvents({ timeframe: "past" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/events" className="hover:text-gray-800">
          Предстоящи събития
        </Link>
        <span className="mx-2">›</span>
        <span className="text-gray-800">Архив</span>
      </nav>

      <h1 className="mb-2 text-3xl font-bold text-gray-900">Архив</h1>
      <p className="mb-8 text-gray-600">
        Минали бизнес събития в България.
      </p>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-16 text-center text-gray-500">
          <p className="text-lg font-medium">Няма минали събития</p>
          <p className="mt-1 text-sm">Архивът е празен засега.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500">
            {events.length}{" "}
            {events.length === 1 ? "събитие" : "събития"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
