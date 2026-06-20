import type { Metadata } from "next";
import Link from "next/link";
import SubscriptionForm from "@/components/SubscriptionForm";
import { getFilterOptions } from "@/lib/events";
import { createSubscription } from "@/lib/actions/subscription-actions";

export const metadata: Metadata = { title: "Нов абонамент" };

export default async function NewSubscriptionPage() {
  const { cities, eventTypes, topics, tags } = await getFilterOptions();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/profile/subscriptions"
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Назад
        </Link>
        <h2 className="text-lg font-semibold text-gray-900">Нов абонамент</h2>
      </div>

      <SubscriptionForm
        cities={cities}
        eventTypes={eventTypes}
        topics={topics}
        tags={tags}
        action={createSubscription}
        submitLabel="Създай абонамент"
      />
    </div>
  );
}
