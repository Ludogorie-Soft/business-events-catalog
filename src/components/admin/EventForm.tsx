"use client";

import { useState } from "react";
import type { City, EventType, Event, Tag, PriceType } from "@/generated/prisma/client";
import RichTextEditor from "./RichTextEditor";

type Props = {
  cities: City[];
  eventTypes: EventType[];
  tags: Tag[];
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Partial<Event>;
  selectedTagIds?: string[];
  submitLabel?: string;
  showPublishToggle?: boolean;
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

function toDatetimeLocal(date?: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventForm({
  cities,
  eventTypes,
  tags,
  action,
  defaultValues,
  selectedTagIds = [],
  submitLabel = "Запази",
  showPublishToggle = true,
}: Props) {
  const onlineCity = cities.find((c) => c.slug === "online");

  const [locationType, setLocationType] = useState<"PHYSICAL" | "ONLINE" | "HYBRID">(
    defaultValues?.locationType ?? "PHYSICAL"
  );
  const [cityId, setCityId] = useState(defaultValues?.cityId ?? "");
  const [priceType, setPriceType] = useState<PriceType>(
    defaultValues?.priceType ?? "UNKNOWN"
  );

  function handleLocationChange(value: string) {
    setLocationType(value as "PHYSICAL" | "ONLINE" | "HYBRID");
    if (value === "ONLINE") {
      setCityId(onlineCity?.id ?? "");
    } else {
      // Only clear if it was previously set to online city
      if (cityId === onlineCity?.id) {
        setCityId("");
      }
    }
  }

  const isOnline = locationType === "ONLINE";

  return (
    <form action={action} className="space-y-5 max-w-3xl">
      <Field label="Заглавие *">
        <input
          name="title"
          required
          defaultValue={defaultValues?.title ?? ""}
          className={inputCls}
        />
      </Field>

      {/* Row 1: Формат, Град, Вид събитие */}
      <div className="grid grid-cols-3 gap-4">
        <Field label="Формат *">
          <select
            name="locationType"
            required
            value={locationType}
            onChange={(e) => handleLocationChange(e.target.value)}
            className={selectCls}
          >
            <option value="PHYSICAL">На живо</option>
            <option value="ONLINE">Онлайн</option>
            <option value="HYBRID">Хибридно</option>
          </select>
        </Field>

        <Field label="Град *">
          {isOnline && (
            <input type="hidden" name="cityId" value={onlineCity?.id ?? ""} />
          )}
          <select
            name={isOnline ? "_cityId_disabled" : "cityId"}
            required={!isOnline}
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            disabled={isOnline}
            className={isOnline ? disabledCls : selectCls}
          >
            <option value="">— Изберете —</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.nameBg}</option>
            ))}
          </select>
        </Field>

        <Field label="Вид събитие *">
          <select
            name="eventTypeId"
            required
            defaultValue={defaultValues?.eventTypeId ?? ""}
            className={selectCls}
          >
            <option value="">— Изберете —</option>
            {eventTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.nameBg}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Row 2: Начало, Край */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Начало *">
          <input
            type="datetime-local"
            name="startAt"
            required
            defaultValue={toDatetimeLocal(defaultValues?.startAt)}
            className={inputCls}
          />
        </Field>
        <Field label="Край">
          <input
            type="datetime-local"
            name="endAt"
            defaultValue={toDatetimeLocal(defaultValues?.endAt)}
            className={inputCls}
          />
        </Field>
      </div>

      {/* Row 3: Цена type, Език */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Цена *">
          <select
            name="priceType"
            required
            value={priceType}
            onChange={(e) => setPriceType(e.target.value as PriceType)}
            className={selectCls}
          >
            <option value="UNKNOWN">Неизвестна</option>
            <option value="FREE">Безплатно</option>
            <option value="PAID">Платено</option>
          </select>
        </Field>

        <Field label="Език">
          <select
            name="language"
            defaultValue={defaultValues?.language ?? ""}
            className={selectCls}
          >
            <option value="">—</option>
            <option value="BG">Български</option>
            <option value="EN">Английски</option>
            <option value="MIXED">Смесен</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Мин. цена (евро)">
          <input
            type="number"
            name="priceMin"
            min="0"
            step="0.01"
            disabled={priceType === "FREE"}
            defaultValue={defaultValues?.priceMin?.toString() ?? ""}
            className={priceType === "FREE" ? disabledCls : inputCls}
          />
        </Field>
        <Field label="Макс. цена (евро)">
          <input
            type="number"
            name="priceMax"
            min="0"
            step="0.01"
            disabled={priceType === "FREE"}
            defaultValue={defaultValues?.priceMax?.toString() ?? ""}
            className={priceType === "FREE" ? disabledCls : inputCls}
          />
        </Field>
      </div>

      <Field label="Кратко описание">
        <RichTextEditor
          name="shortDescription"
          defaultValue={defaultValues?.shortDescription ?? ""}
          placeholder="Кратко описание на събитието..."
        />
      </Field>

      <Field label="Пълно описание">
        <RichTextEditor
          name="description"
          defaultValue={defaultValues?.descriptionHtml ?? ""}
          placeholder="Подробно описание, програма, лектори..."
        />
      </Field>

      <Field label="URL за регистрация">
        <input
          type="url"
          name="registrationUrl"
          defaultValue={defaultValues?.registrationUrl ?? ""}
          className={inputCls}
        />
      </Field>

      <Field label="Онлайн линк (Zoom / Meet)">
        <input
          type="url"
          name="onlineUrl"
          defaultValue={defaultValues?.onlineUrl ?? ""}
          className={inputCls}
        />
      </Field>

      <Field label="Външен URL">
        <input
          type="url"
          name="externalUrl"
          defaultValue={defaultValues?.externalUrl ?? ""}
          className={inputCls}
        />
      </Field>

      <Field label="URL на корица (изображение)">
        <input
          type="url"
          name="coverImageUrl"
          defaultValue={defaultValues?.coverImageUrl ?? ""}
          className={inputCls}
        />
      </Field>

      <Field label="Капацитет (места)">
        <input
          type="number"
          name="capacity"
          min="1"
          defaultValue={defaultValues?.capacity?.toString() ?? ""}
          className={inputCls}
        />
      </Field>

      {tags.length > 0 && (
        <Field label="Тагове">
          <div className="flex flex-wrap gap-2 rounded-lg border border-gray-300 p-3">
            {tags.map((tag) => {
              const checked = selectedTagIds.includes(tag.id);
              return (
                <label
                  key={tag.id}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700"
                >
                  <input
                    type="checkbox"
                    name="tagIds"
                    value={tag.id}
                    defaultChecked={checked}
                    className="h-3 w-3 accent-blue-600"
                  />
                  {tag.nameBg}
                  <span className="text-gray-400">#{tag.nameEn}</span>
                </label>
              );
            })}
          </div>
        </Field>
      )}

      <div className="flex items-center gap-3 border-t border-gray-100 pt-5">
        {showPublishToggle ? (
          <>
            <button
              type="submit"
              name="publish"
              value="false"
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Запази като чернова
            </button>
            <button
              type="submit"
              name="publish"
              value="true"
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Публикувай събитие
            </button>
          </>
        ) : (
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            {submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
