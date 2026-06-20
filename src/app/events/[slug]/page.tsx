import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getEventBySlug } from "@/lib/events";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};
  return {
    title: event.title,
    description: event.shortDescription ?? undefined,
  };
}

const locationLabels: Record<string, string> = {
  PHYSICAL: "На живо",
  ONLINE: "Онлайн",
  HYBRID: "Хибридно",
};

const priceLabels: Record<string, string> = {
  FREE: "Безплатно",
  PAID: "Платено",
  UNKNOWN: "Неизвестна цена",
};

const languageLabels: Record<string, string> = {
  BG: "Български",
  EN: "Английски",
  MIXED: "Смесен",
};

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event || event.status !== "PUBLISHED") notFound();

  const startDate = new Date(event.startAt).toLocaleDateString("bg-BG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const startTime = new Date(event.startAt).toLocaleTimeString("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = event.endAt
    ? new Date(event.endAt).toLocaleTimeString("bg-BG", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/events"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        ← Обратно към всички събития
      </Link>

      {event.coverImageUrl && (
        <img
          src={event.coverImageUrl}
          alt={event.title}
          className="mb-6 h-64 w-full rounded-2xl object-cover"
        />
      )}

      {/* Badges */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          {event.eventType.nameBg}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
          {locationLabels[event.locationType]}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            event.priceType === "FREE"
              ? "bg-green-50 text-green-700"
              : event.priceType === "PAID"
              ? "bg-amber-50 text-amber-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {priceLabels[event.priceType]}
        </span>
        {event.language && (
          <span className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">
            {languageLabels[event.language]}
          </span>
        )}
      </div>

      <h1 className="mb-6 text-3xl font-bold text-gray-900">{event.title}</h1>

      {/* Meta info */}
      <div className="mb-8 grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700 sm:grid-cols-2">
        <div>
          <span className="font-semibold">📅 Дата:</span>{" "}
          {startDate}, {startTime}
          {endTime && ` – ${endTime}`}
        </div>
        <div>
          <span className="font-semibold">📍 Място:</span>{" "}
          {event.locationType === "ONLINE"
            ? "Онлайн"
            : event.venue
            ? `${event.venue.name}, ${event.city.nameBg}`
            : event.city.nameBg}
        </div>
        {event.organizer && (
          <div>
            <span className="font-semibold">🏢 Организатор:</span>{" "}
            {event.organizer.websiteUrl ? (
              <a
                href={event.organizer.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {event.organizer.name}
              </a>
            ) : (
              event.organizer.name
            )}
          </div>
        )}
        {event.priceType === "PAID" && event.priceMin != null && (
          <div>
            <span className="font-semibold">💰 Цена:</span>{" "}
            {Number(event.priceMin).toFixed(0)}{" "}
            {event.priceMax && Number(event.priceMax) !== Number(event.priceMin)
              ? `– ${Number(event.priceMax).toFixed(0)} `
              : ""}
            {event.currency ?? "BGN"}
          </div>
        )}
        {event.capacity && (
          <div>
            <span className="font-semibold">👥 Капацитет:</span> {event.capacity} места
          </div>
        )}
      </div>

      {/* Topics & Tags */}
      {(event.topics.length > 0 || event.tags.length > 0) && (
        <div className="mb-8 flex flex-wrap gap-2">
          {event.topics.map(({ topic }) => (
            <Link
              key={topic.id}
              href={`/events?topic=${topic.slug}`}
              className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
            >
              {topic.nameBg}
            </Link>
          ))}
          {event.tags.map(({ tag }) => (
            <Link
              key={tag.id}
              href={`/events?tag=${tag.slug}`}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
            >
              #{tag.nameEn}
            </Link>
          ))}
        </div>
      )}

      {/* Description */}
      {event.descriptionHtml ? (
        <div
          className="prose prose-gray max-w-none"
          dangerouslySetInnerHTML={{ __html: event.descriptionHtml }}
        />
      ) : event.shortDescription ? (
        <p className="text-gray-700 leading-relaxed">{event.shortDescription}</p>
      ) : null}

      {/* CTA */}
      <div className="mt-10 flex flex-wrap gap-3">
        {event.registrationUrl && (
          <a
            href={event.registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Регистрирай се
          </a>
        )}
        {event.onlineUrl && event.locationType !== "PHYSICAL" && (
          <a
            href={event.onlineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Присъедини се онлайн
          </a>
        )}
        {event.externalUrl && (
          <a
            href={event.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Виж на сайта на събитието
          </a>
        )}
      </div>
    </div>
  );
}
