import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import SubscriptionForm from "@/components/SubscriptionForm";
import { auth } from "@/auth";
import { getFilterOptions } from "@/lib/events";
import { getUserSubscription } from "@/lib/subscriptions";
import { updateSubscription } from "@/lib/actions/subscription-actions";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Редактирай абонамент" };

export default async function EditSubscriptionPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const [subscription, { cities, eventTypes, topics, tags }] = await Promise.all([
    getUserSubscription(session!.user.id, id),
    getFilterOptions(),
  ]);

  if (!subscription) notFound();

  const updateWithId = updateSubscription.bind(null, id);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/profile/subscriptions"
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Назад
        </Link>
        <h2 className="text-lg font-semibold text-gray-900">Редактирай абонамент</h2>
      </div>

      <SubscriptionForm
        cities={cities}
        eventTypes={eventTypes}
        topics={topics}
        tags={tags}
        action={updateWithId}
        defaultValues={{
          name: subscription.name,
          frequency: subscription.frequency,
          priceType: subscription.priceType,
          locationType: subscription.locationType,
          language: subscription.language,
          maxPrice:
            subscription.maxPrice != null ? Number(subscription.maxPrice) : null,
          cityIds: subscription.cities.map(({ cityId }) => cityId),
          eventTypeIds: subscription.eventTypes.map(({ eventTypeId }) => eventTypeId),
          topicIds: subscription.topics.map(({ topicId }) => topicId),
          tagIds: subscription.tags.map(({ tagId }) => tagId),
        }}
        submitLabel="Запази промените"
      />
    </div>
  );
}
