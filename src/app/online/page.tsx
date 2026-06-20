import type { Metadata } from "next";
import Link from "next/link";
import EventCard from "@/components/EventCard";
import { getEvents } from "@/lib/events";
import { cityContent } from "@/lib/city-content";

const content = cityContent.online;

export const metadata: Metadata = {
  title: content.seoTitle,
  description: content.metaDescription,
  openGraph: {
    title: content.seoTitle,
    description: content.metaDescription,
  },
};

export default async function OnlinePage() {
  const events = await getEvents({ locationType: "ONLINE" });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/events" className="hover:text-gray-800">
          Всички събития
        </Link>
        <span className="mx-2">›</span>
        <span className="text-gray-800">Онлайн</span>
      </nav>

      {/* Hero */}
      <div className="mb-8 rounded-2xl bg-indigo-50 px-8 py-10">
        <h1 className="mb-3 text-3xl font-bold text-gray-900">
          {content.seoTitle}
        </h1>
        <p className="max-w-2xl text-gray-600 leading-relaxed">{content.intro}</p>
        <div className="mt-5">
          <Link
            href="/events?location=ONLINE"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Виж всички с филтри
          </Link>
        </div>
      </div>

      {/* Upcoming online events */}
      <h2 className="mb-5 text-xl font-bold text-gray-900">
        Предстоящи онлайн събития
      </h2>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          <p className="font-medium">Няма предстоящи онлайн събития</p>
          <p className="mt-1 text-sm">Проверете отново по-късно.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
