"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type {
  City,
  EventType,
  Language,
  LocationType,
  PriceType,
  Topic,
  Tag,
} from "@/generated/prisma/client";
import { isWeekPreset, resolveWeekRange } from "@/lib/week-range";

type OptionWithCount<T> = T & { count: number };

type Props = {
  cities: OptionWithCount<City>[];
  eventTypes: OptionWithCount<EventType>[];
  topics: OptionWithCount<Topic>[];
  tags: OptionWithCount<Tag>[];
  priceCounts: Partial<Record<PriceType, number>>;
  locationCounts: Partial<Record<LocationType, number>>;
  languageCounts: Partial<Record<Language, number>>;
};

const extendedFilterKeys = ["type", "tag", "location", "language", "from", "to"];

function withCount(label: string, count: number | undefined) {
  return `${label} (${count ?? 0})`;
}

function formatBgDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export default function EventFilters({
  cities,
  eventTypes,
  topics,
  tags,
  priceCounts,
  locationCounts,
  languageCounts,
}: Props) {
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

      // week and absolute dates are mutually exclusive
      if (key === "week") {
        params.delete("from");
        params.delete("to");
      } else if (key === "from" || key === "to") {
        params.delete("week");
      }

      router.push(`/events?${params.toString()}`);
    },
    [router, searchParams]
  );

  const val = (key: string) => searchParams.get(key) ?? "";
  const week = val("week");
  const weekRange = isWeekPreset(week) ? resolveWeekRange(week) : null;

  function SelectFilter({
    label,
    paramKey,
    options,
  }: {
    label: string;
    paramKey: string;
    options: { slug: string; nameBg: string; count: number }[];
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
            <option key={o.slug} value={o.slug}>
              {withCount(o.nameBg, o.count)}
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
      <SelectFilter label="Град" paramKey="city" options={cities} />
      <SelectFilter label="Тема" paramKey="topic" options={topics} />

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
          <option value="FREE">{withCount("Безплатно", priceCounts.FREE)}</option>
          <option value="PAID">{withCount("Платено", priceCounts.PAID)}</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Седмица
        </label>
        <select
          value={week}
          onChange={(e) => setFilter("week", e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Всички</option>
          <option value="current">Тази седмица</option>
          <option value="next">Следваща седмица</option>
        </select>
        {weekRange && (
          <p className="mt-1 text-xs text-gray-500">
            {formatBgDate(weekRange.dateFrom)} – {formatBgDate(weekRange.dateTo)}
          </p>
        )}
      </div>

      {/* Extended filters */}
      {showMore && (
        <div className="space-y-5 border-t border-gray-100 pt-4">
          <SelectFilter
            label="Вид събитие"
            paramKey="type"
            options={eventTypes}
          />
          <SelectFilter label="Таг" paramKey="tag" options={tags} />

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
              <option value="PHYSICAL">
                {withCount("На живо", locationCounts.PHYSICAL)}
              </option>
              <option value="ONLINE">
                {withCount("Онлайн", locationCounts.ONLINE)}
              </option>
              <option value="HYBRID">
                {withCount("Хибридно", locationCounts.HYBRID)}
              </option>
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
              <option value="BG">{withCount("Български", languageCounts.BG)}</option>
              <option value="EN">{withCount("Английски", languageCounts.EN)}</option>
              <option value="MIXED">{withCount("Смесен", languageCounts.MIXED)}</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              От дата
            </label>
            <input
              type="date"
              value={weekRange ? weekRange.dateFrom : val("from")}
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
              value={weekRange ? weekRange.dateTo : val("to")}
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
