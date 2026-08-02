"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { City, EventType, Topic } from "@/generated/prisma/client";

type Props = {
  cities: City[];
  topics: Topic[];
  eventTypes: EventType[];
};

const selectCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export default function AdminSubscribersFilters({
  cities,
  topics,
  eventTypes,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const val = (key: string) => searchParams.get(key) ?? "";

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      const qs = params.toString();
      router.push(qs ? `/admin/subscribers?${qs}` : "/admin/subscribers");
    },
    [router, searchParams]
  );

  const clearFilters = () => {
    const sort = searchParams.get("sort");
    const params = new URLSearchParams();
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    router.push(qs ? `/admin/subscribers?${qs}` : "/admin/subscribers");
  };

  const hasFilters = ["city", "online", "topic", "price", "type", "language", "status"].some(
    (k) => searchParams.has(k)
  );

  const exportHref = `/api/admin/subscribers/export${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;

  return (
    <div className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-800">Филтри</h2>
        <div className="flex flex-wrap items-center gap-2">
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:underline"
            >
              Изчисти филтри
            </button>
          ) : null}
          <a
            href={exportHref}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Експорт Excel
          </a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Град
          </label>
          <select
            value={val("city")}
            onChange={(e) => setParam("city", e.target.value)}
            className={selectCls}
          >
            <option value="">Всички</option>
            {cities.map((city) => (
              <option key={city.id} value={city.slug}>
                {city.nameBg}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Онлайн
          </label>
          <select
            value={val("online")}
            onChange={(e) => setParam("online", e.target.value)}
            className={selectCls}
          >
            <option value="">Всички</option>
            <option value="yes">Да</option>
            <option value="no">Не</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Тема
          </label>
          <select
            value={val("topic")}
            onChange={(e) => setParam("topic", e.target.value)}
            className={selectCls}
          >
            <option value="">Всички</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.slug}>
                {topic.nameBg}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Цена
          </label>
          <select
            value={val("price")}
            onChange={(e) => setParam("price", e.target.value)}
            className={selectCls}
          >
            <option value="">Всички</option>
            <option value="FREE">Безплатно</option>
            <option value="PAID">Платено</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Вид събитие
          </label>
          <select
            value={val("type")}
            onChange={(e) => setParam("type", e.target.value)}
            className={selectCls}
          >
            <option value="">Всички</option>
            {eventTypes.map((type) => (
              <option key={type.id} value={type.slug}>
                {type.nameBg}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Език
          </label>
          <select
            value={val("language")}
            onChange={(e) => setParam("language", e.target.value)}
            className={selectCls}
          >
            <option value="">Всички</option>
            <option value="BG">Български</option>
            <option value="EN">Английски</option>
            <option value="MIXED">Смесен</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Статус
          </label>
          <select
            value={val("status")}
            onChange={(e) => setParam("status", e.target.value)}
            className={selectCls}
          >
            <option value="">Всички</option>
            <option value="active">Активен</option>
            <option value="pending">Чака потвърждение</option>
            <option value="inactive">Неактивен</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Подреди по
          </label>
          <select
            value={val("sort") || "createdAt_desc"}
            onChange={(e) => setParam("sort", e.target.value === "createdAt_desc" ? "" : e.target.value)}
            className={selectCls}
          >
            <option value="createdAt_desc">Създаден (най-нови)</option>
            <option value="createdAt_asc">Създаден (най-стари)</option>
            <option value="email_asc">Имейл (А–Я)</option>
            <option value="email_desc">Имейл (Я–А)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
