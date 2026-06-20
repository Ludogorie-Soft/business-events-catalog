import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import EventCard from "@/components/EventCard";
import { getEvents } from "@/lib/events";
import { cityContent } from "@/lib/city-content";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return Object.keys(cityContent)
    .filter((s) => s !== "online")
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const content = cityContent[slug];
  if (!content) return {};
  return {
    title: content.seoTitle,
    description: content.metaDescription,
    openGraph: {
      title: content.seoTitle,
      description: content.metaDescription,
    },
  };
}

export default async function CityPage({ params }: Props) {
  const { slug } = await params;
  const content = cityContent[slug];

  if (!content || slug === "online") notFound();

  const city = await prisma.city.findUnique({ where: { slug } });
  if (!city) notFound();

  const events = await getEvents({ citySlug: slug });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/events" className="hover:text-gray-800">
          Всички събития
        </Link>
        <span className="mx-2">›</span>
        <span className="text-gray-800">{content.nameBg}</span>
      </nav>

      {/* Hero */}
      <div className="mb-8 rounded-2xl bg-blue-50 px-8 py-10">
        <h1 className="mb-3 text-3xl font-bold text-gray-900">
          {content.seoTitle}
        </h1>
        <p className="max-w-2xl text-gray-600 leading-relaxed">{content.intro}</p>
        <div className="mt-5 flex gap-3">
          <Link
            href={`/events?city=${slug}`}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Виж всички с филтри
          </Link>
        </div>
      </div>

      {/* Upcoming events */}
      <h2 className="mb-5 text-xl font-bold text-gray-900">
        Предстоящи събития в {content.nameBg}
      </h2>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          <p className="font-medium">Няма предстоящи събития в {content.nameBg}</p>
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
