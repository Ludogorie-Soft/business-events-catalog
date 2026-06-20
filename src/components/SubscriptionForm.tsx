"use client";

import { useState } from "react";
import type {
  City,
  EventType,
  Language,
  LocationType,
  PriceType,
  SubscriptionFrequency,
  Tag,
  Topic,
} from "@/generated/prisma/client";

export type SubscriptionFormValues = {
  name: string;
  frequency: SubscriptionFrequency;
  priceType?: PriceType | null;
  locationType?: LocationType | null;
  language?: Language | null;
  maxPrice?: number | string | null;
  cityIds: string[];
  eventTypeIds: string[];
  topicIds: string[];
  tagIds: string[];
};

type Props = {
  cities: City[];
  eventTypes: EventType[];
  topics: Topic[];
  tags: Tag[];
  action: (formData: FormData) => Promise<void>;
  defaultValues?: SubscriptionFormValues;
  submitLabel?: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const selectCls = inputCls;
const disabledCls =
  "w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-400 cursor-not-allowed outline-none";

function CheckboxGroup({
  label,
  name,
  options,
  selectedIds: initialSelectedIds,
}: {
  label: string;
  name: string;
  options: { id: string; label: string }[];
  selectedIds: string[];
}) {
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);

  if (options.length === 0) return null;

  const allSelected =
    options.length > 0 && options.every((option) => selectedIds.includes(option.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? options.map((option) => option.id) : []);
  }

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-600">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={(e) => toggleAll(e.target.checked)}
            className="h-3.5 w-3.5 accent-blue-600"
          />
          Избери всички
        </label>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-300 p-3">
        {options.map((option) => {
          const checked = selectedIds.includes(option.id);
          return (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700"
            >
              <input
                type="checkbox"
                name={name}
                value={option.id}
                checked={checked}
                onChange={() => toggle(option.id)}
                className="h-3 w-3 accent-blue-600"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function SubscriptionForm({
  cities,
  eventTypes,
  topics,
  tags,
  action,
  defaultValues,
  submitLabel = "Запази",
}: Props) {
  const values: SubscriptionFormValues = {
    name: "",
    frequency: "WEEKLY",
    cityIds: [],
    eventTypeIds: [],
    topicIds: [],
    tagIds: [],
    ...defaultValues,
  };

  const [priceType, setPriceType] = useState(values.priceType ?? "");
  const isFree = priceType === "FREE";

  return (
    <form action={action} className="max-w-3xl space-y-5">
      <Field label="Име на абонамента *">
        <input
          name="name"
          required
          defaultValue={values.name}
          placeholder="Напр. Софийски стартип събития"
          className={inputCls}
        />
      </Field>

      <Field label="Честота *">
        <div className="flex gap-3">
          {(
            [
              { value: "DAILY", label: "Ежедневно" },
              { value: "WEEKLY", label: "Седмично" },
            ] as const
          ).map(({ value, label }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
            >
              <input
                type="radio"
                name="frequency"
                value={value}
                defaultChecked={values.frequency === value}
                required
                className="accent-blue-600"
              />
              {label}
            </label>
          ))}
        </div>
      </Field>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-4 text-sm font-semibold text-gray-800">Филтри</h3>
        <p className="mb-4 text-xs text-gray-500">
          Оставете празно, за да получавате събития от всички категории в дадената група.
        </p>

        <div className="space-y-4">
          <CheckboxGroup
            label="Градове"
            name="cityIds"
            selectedIds={values.cityIds}
            options={cities.map((city) => ({ id: city.id, label: city.nameBg }))}
          />

          <CheckboxGroup
            label="Видове събития"
            name="eventTypeIds"
            selectedIds={values.eventTypeIds}
            options={eventTypes.map((type) => ({ id: type.id, label: type.nameBg }))}
          />

          <CheckboxGroup
            label="Теми"
            name="topicIds"
            selectedIds={values.topicIds}
            options={topics.map((topic) => ({ id: topic.id, label: topic.nameBg }))}
          />

          <CheckboxGroup
            label="Тагове"
            name="tagIds"
            selectedIds={values.tagIds}
            options={tags.map((tag) => ({
              id: tag.id,
              label: `${tag.nameBg} #${tag.nameEn}`,
            }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Цена">
              <select
                name="priceType"
                value={priceType}
                onChange={(e) => setPriceType(e.target.value)}
                className={selectCls}
              >
                <option value="">Всички</option>
                <option value="FREE">Безплатно</option>
                <option value="PAID">Платено</option>
              </select>
            </Field>

            <Field label="Формат">
              <select
                name="locationType"
                defaultValue={values.locationType ?? ""}
                className={selectCls}
              >
                <option value="">Всички</option>
                <option value="PHYSICAL">На живо</option>
                <option value="ONLINE">Онлайн</option>
                <option value="HYBRID">Хибридно</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Език">
              <select name="language" defaultValue={values.language ?? ""} className={selectCls}>
                <option value="">Всички</option>
                <option value="BG">Български</option>
                <option value="EN">Английски</option>
                <option value="MIXED">Смесен</option>
              </select>
            </Field>

            <Field label="Макс. цена (EUR)">
              <input
                type="number"
                name="maxPrice"
                min="0"
                step="0.01"
                disabled={isFree}
                defaultValue={
                  values.maxPrice != null && values.maxPrice !== ""
                    ? String(values.maxPrice)
                    : ""
                }
                className={isFree ? disabledCls : inputCls}
              />
            </Field>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
      >
        {submitLabel}
      </button>
    </form>
  );
}
