import Link from "next/link";
import type { Event, City, EventType, Venue } from "@/generated/prisma/client";

type Props = {
  event: Event & {
    city: City;
    eventType: EventType;
    venue: Venue | null;
  };
};

const locationLabels: Record<string, string> = {
  PHYSICAL: "На живо",
  ONLINE: "Онлайн",
  HYBRID: "Хибридно",
};

const priceLabels: Record<string, string> = {
  FREE: "Безплатно",
  PAID: "Платено",
  UNKNOWN: "",
};

export default function EventCard({ event }: Props) {
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
    <Link href={`/events/${event.slug}`} className="group block">
      <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md h-full">
        {event.coverImageUrl && (
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="mb-4 h-40 w-full rounded-lg object-cover"
          />
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {event.eventType.nameBg}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {locationLabels[event.locationType]}
          </span>
          {event.priceType !== "UNKNOWN" && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                event.priceType === "FREE"
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {priceLabels[event.priceType]}
            </span>
          )}
        </div>

        <h2 className="mb-2 text-base font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2">
          {event.title}
        </h2>

        {event.shortDescription && (
          <p className="mb-3 text-sm text-gray-500 line-clamp-2">
            {event.shortDescription}
          </p>
        )}

        <div className="mt-auto space-y-1 text-sm text-gray-500">
          <p>
            📅 {dateStr} · {timeStr}
          </p>
          <p>
            📍{" "}
            {event.locationType === "ONLINE"
              ? "Онлайн"
              : event.venue?.name
              ? `${event.venue.name}, ${event.city.nameBg}`
              : event.city.nameBg}
          </p>
        </div>
      </article>
    </Link>
  );
}
