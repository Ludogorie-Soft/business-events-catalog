import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { getUserSubscriptions } from "@/lib/subscriptions";
import {
  deleteSubscription,
  toggleSubscriptionActive,
} from "@/lib/actions/subscription-actions";

export const metadata: Metadata = { title: "Абонаменти" };

const frequencyLabels = {
  DAILY: "Ежедневно",
  WEEKLY: "Седмично",
} as const;

const priceLabels = {
  FREE: "Безплатно",
  PAID: "Платено",
} as const;

const locationLabels = {
  PHYSICAL: "На живо",
  ONLINE: "Онлайн",
  HYBRID: "Хибридно",
} as const;

const languageLabels = {
  BG: "Български",
  EN: "Английски",
  MIXED: "Смесен",
} as const;

function FilterChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
      {children}
    </span>
  );
}

export default async function ProfileSubscriptionsPage() {
  const session = await auth();
  const subscriptions = await getUserSubscriptions(session!.user.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Моите абонаменти</h2>
          <p className="text-sm text-gray-500">
            Получавайте известия за нови събития по вашите критерии.
          </p>
        </div>
        <Link
          href="/profile/subscriptions/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          + Нов абонамент
        </Link>
      </div>

      {subscriptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          <p className="font-medium">Нямате абонаменти</p>
          <p className="mt-1 text-sm">
            Създайте абонамент, за да получавате известия за интересни събития.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((subscription) => {
            const chips: string[] = [
              ...subscription.cities.map(({ city }) => city.nameBg),
              ...subscription.eventTypes.map(({ eventType }) => eventType.nameBg),
              ...subscription.topics.map(({ topic }) => topic.nameBg),
              ...subscription.tags.map(({ tag }) => `#${tag.nameEn}`),
            ];

            if (subscription.priceType === "FREE" || subscription.priceType === "PAID") {
              chips.push(priceLabels[subscription.priceType]);
            }
            if (subscription.locationType) chips.push(locationLabels[subscription.locationType]);
            if (subscription.language) chips.push(languageLabels[subscription.language]);
            if (subscription.maxPrice != null) {
              chips.push(`до ${Number(subscription.maxPrice).toFixed(0)} EUR`);
            }

            return (
              <article
                key={subscription.id}
                className={`rounded-xl border p-5 ${
                  subscription.active
                    ? "border-gray-200 bg-white"
                    : "border-gray-200 bg-gray-50 opacity-75"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{subscription.name}</h3>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {frequencyLabels[subscription.frequency]}
                      </span>
                      {!subscription.active && (
                        <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          Неактивен
                        </span>
                      )}
                    </div>

                    {chips.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {chips.map((chip) => (
                          <FilterChip key={chip}>{chip}</FilterChip>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Всички събития</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <form action={toggleSubscriptionActive.bind(null, subscription.id)}>
                      <button
                        type="submit"
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        {subscription.active ? "Спри" : "Активирай"}
                      </button>
                    </form>
                    <Link
                      href={`/profile/subscriptions/${subscription.id}`}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Редактирай
                    </Link>
                    <form action={deleteSubscription.bind(null, subscription.id)}>
                      <button
                        type="submit"
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        Изтрий
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
