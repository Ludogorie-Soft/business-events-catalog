"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { City, EventType, Topic, Tag } from "@/generated/prisma/client";

type Props = {
  cities: City[];
  eventTypes: EventType[];
  topics: Topic[];
  tags: Tag[];
};

const extendedFilterKeys = ["type", "tag", "location", "language", "from", "to"];

export default function EventFilters({ cities, eventTypes, topics, tags }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-expand if any extended filter is already active
  const hasExtendedActive = extendedFilterKeys.some((k) => searchParams.has(k));
  const [showMore, setShowMore] = useState(hasExtendedActive);

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/events?${params.toString()}`);
    },
    [router, searchParams]
  );

  const val = (key: string) => searchParams.get(key) ?? "";

  function SelectFilter({
    label,
    paramKey,
    options,
    labelKey = "nameBg",
    valueKey = "slug",
  }: {
    label: string;
    paramKey: string;
    options: Record<string, string>[];
    labelKey?: string;
    valueKey?: string;
  }) {
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </label>
        <select
          value={val(paramKey)}
          onChange={(e) => setFilter(paramKey, e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Всички</option>
          {options.map((o) => (
            <option key={o[valueKey]} value={o[valueKey]}>
              {o[labelKey]}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const hasFilters = [...searchParams.keys()].length > 0;

  return (
    <aside className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
          Филтри
        </h2>
        {hasFilters && (
          <button
            onClick={() => router.push("/events")}
            className="text-xs text-blue-600 hover:underline"
          >
            Изчисти
          </button>
        )}
      </div>

      {/* Always visible */}
      <SelectFilter
        label="Град"
        paramKey="city"
        options={cities as unknown as Record<string, string>[]}
      />
      <SelectFilter
        label="Тема"
        paramKey="topic"
        options={topics as unknown as Record<string, string>[]}
      />

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Цена
        </label>
        <select
          value={val("price")}
          onChange={(e) => setFilter("price", e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Всички</option>
          <option value="FREE">Безплатно</option>
          <option value="PAID">Платено</option>
        </select>
      </div>

      {/* Extended filters */}
      {showMore && (
        <div className="space-y-5 border-t border-gray-100 pt-4">
          <SelectFilter
            label="Вид събитие"
            paramKey="type"
            options={eventTypes as unknown as Record<string, string>[]}
          />
          <SelectFilter
            label="Таг"
            paramKey="tag"
            options={tags as unknown as Record<string, string>[]}
          />

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Формат
            </label>
            <select
              value={val("location")}
              onChange={(e) => setFilter("location", e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Всички</option>
              <option value="PHYSICAL">На живо</option>
              <option value="ONLINE">Онлайн</option>
              <option value="HYBRID">Хибридно</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Език
            </label>
            <select
              value={val("language")}
              onChange={(e) => setFilter("language", e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Всички</option>
              <option value="BG">Български</option>
              <option value="EN">Английски</option>
              <option value="MIXED">Смесен</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              От дата
            </label>
            <input
              type="date"
              value={val("from")}
              onChange={(e) => setFilter("from", e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              До дата
            </label>
            <input
              type="date"
              value={val("to")}
              onChange={(e) => setFilter("to", e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      )}

      <button
        onClick={() => setShowMore((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
      >
        {showMore ? (
          <>
            <span>▲</span> По-малко филтри
          </>
        ) : (
          <>
            <span>▼</span> Повече филтри
          </>
        )}
      </button>
    </aside>
  );
}
