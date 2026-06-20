import type { Metadata } from "next";
import Link from "next/link";
import EventForm from "@/components/admin/EventForm";
import { getFilterOptions } from "@/lib/events";
import { createEvent } from "@/lib/actions/event-actions";

export const metadata: Metadata = { title: "Ново събитие" };

export default async function NewEventPage() {
  const { cities, eventTypes } = await getFilterOptions();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/events" className="text-sm text-gray-500 hover:text-gray-800">
          ← Назад
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Ново събитие</h1>
      </div>

      <EventForm
        cities={cities}
        eventTypes={eventTypes}
        action={createEvent}
        submitLabel="Създай събитие"
      />
    </div>
  );
}
