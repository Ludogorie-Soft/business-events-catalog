import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import AdminSubscribersFilters from "@/components/admin/AdminSubscribersFilters";
import {
  adminSubscriberFiltersToSearchParams,
  formatAdminDateTime,
  frequencyLabels,
  getAdminSubscriptions,
  getSubscriptionStatus,
  languageLabels,
  locationLabels,
  parseAdminSubscriberFilters,
  priceLabels,
  statusLabels,
  type AdminSubscriberSort,
} from "@/lib/admin-subscribers";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Абонати" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function FilterCell({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-gray-700">{value ?? "—"}</dd>
    </div>
  );
}

function SortHeader({
  label,
  asc,
  desc,
  currentSort,
  filtersQuery,
}: {
  label: string;
  asc: AdminSubscriberSort;
  desc: AdminSubscriberSort;
  currentSort: AdminSubscriberSort;
  filtersQuery: string;
}) {
  const nextSort = currentSort === asc ? desc : asc;
  const params = new URLSearchParams(filtersQuery);
  if (nextSort === "createdAt_desc") params.delete("sort");
  else params.set("sort", nextSort);
  const href = params.toString()
    ? `/admin/subscribers?${params.toString()}`
    : "/admin/subscribers";

  const indicator =
    currentSort === asc ? " ↑" : currentSort === desc ? " ↓" : "";

  return (
    <Link href={href} className="font-semibold text-gray-600 hover:text-blue-600">
      {label}
      {indicator}
    </Link>
  );
}

export default async function AdminSubscribersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const filters = parseAdminSubscriberFilters(sp);
  const filterParams = adminSubscriberFiltersToSearchParams({
    ...filters,
    sort: undefined,
  });
  const filtersQuery = filterParams.toString();
  const currentSort = filters.sort ?? "createdAt_desc";

  const [subscriptions, cities, topics, eventTypes] = await Promise.all([
    getAdminSubscriptions(filters),
    prisma.city.findMany({
      where: { slug: { not: "online" } },
      orderBy: { nameBg: "asc" },
    }),
    prisma.topic.findMany({ orderBy: { nameBg: "asc" } }),
    prisma.eventType.findMany({ orderBy: { nameBg: "asc" } }),
  ]);

  const activeCount = subscriptions.filter((s) => s.active).length;
  const pendingCount = subscriptions.filter(
    (s) => !s.active && s.confirmToken != null
  ).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Абонати</h1>
        <p className="mt-1 text-sm text-gray-500">
          {subscriptions.length} абонамента
          {activeCount > 0 ? ` · ${activeCount} активни` : ""}
          {pendingCount > 0 ? ` · ${pendingCount} чакащи потвърждение` : ""}
        </p>
      </div>

      <Suspense>
        <AdminSubscribersFilters
          cities={cities}
          topics={topics}
          eventTypes={eventTypes}
        />
      </Suspense>

      {subscriptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          <p className="font-medium">Няма абонати</p>
          <p className="mt-1 text-sm">
            Няма резултати за избраните филтри или все още няма абонаменти.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <SortHeader
                    label="Имейл"
                    asc="email_asc"
                    desc="email_desc"
                    currentSort={currentSort}
                    filtersQuery={filtersQuery}
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Статус
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Филтри
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Честота
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader
                    label="Създаден"
                    asc="createdAt_asc"
                    desc="createdAt_desc"
                    currentSort={currentSort}
                    filtersQuery={filtersQuery}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subscriptions.map((subscription) => {
                const citiesList = subscription.cities.map(({ city }) => city);
                const physicalCities = citiesList.filter((c) => c.slug !== "online");
                const includesOnline = citiesList.some((c) => c.slug === "online");
                const topicsList = subscription.topics.map(({ topic }) => topic.nameBg);
                const eventTypesList = subscription.eventTypes.map(
                  ({ eventType }) => eventType.nameBg
                );
                const tags = subscription.tags.map(({ tag }) => `#${tag.nameEn}`);
                const status = getSubscriptionStatus(subscription);
                const isShadow = subscription.user.passwordHash == null;

                return (
                  <tr key={subscription.id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">
                        {subscription.user.email}
                      </div>
                      {subscription.user.name ? (
                        <div className="text-xs text-gray-500">
                          {subscription.user.name}
                        </div>
                      ) : null}
                      <div className="mt-1 text-xs text-gray-400">
                        {subscription.name}
                        {isShadow ? " · без регистрация" : " · регистриран"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          status === "active"
                            ? "bg-green-50 text-green-700"
                            : status === "pending"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {statusLabels[status]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <dl className="grid gap-2 sm:grid-cols-2">
                        <FilterCell
                          label="Град"
                          value={
                            physicalCities.length > 0
                              ? physicalCities.map((c) => c.nameBg).join(", ")
                              : null
                          }
                        />
                        <FilterCell
                          label="Онлайн"
                          value={includesOnline ? "Да" : "Не"}
                        />
                        <FilterCell
                          label="Тема"
                          value={topicsList.length > 0 ? topicsList.join(", ") : null}
                        />
                        <FilterCell
                          label="Цена"
                          value={
                            subscription.priceType === "FREE" ||
                            subscription.priceType === "PAID"
                              ? priceLabels[subscription.priceType]
                              : null
                          }
                        />
                        <FilterCell
                          label="Вид събитие"
                          value={
                            eventTypesList.length > 0
                              ? eventTypesList.join(", ")
                              : null
                          }
                        />
                        <FilterCell
                          label="Език"
                          value={
                            subscription.language
                              ? languageLabels[subscription.language]
                              : null
                          }
                        />
                        {subscription.locationType ? (
                          <FilterCell
                            label="Формат"
                            value={locationLabels[subscription.locationType]}
                          />
                        ) : null}
                        {tags.length > 0 ? (
                          <FilterCell label="Тагове" value={tags.join(", ")} />
                        ) : null}
                        {subscription.maxPrice != null ? (
                          <FilterCell
                            label="Макс. цена"
                            value={`${Number(subscription.maxPrice).toFixed(0)} EUR`}
                          />
                        ) : null}
                      </dl>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {frequencyLabels[subscription.frequency]}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                      {formatAdminDateTime(subscription.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
