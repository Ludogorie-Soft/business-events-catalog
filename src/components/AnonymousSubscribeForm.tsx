"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { City, EventType, Topic } from "@/generated/prisma/client";
import {
  anonymousSubscribe,
  resendSubscribeConfirm,
  type AnonymousSubscribeState,
} from "@/lib/actions/anonymous-subscribe-actions";

const initialState: AnonymousSubscribeState = { ok: false };

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

type Props = {
  cities: City[];
  topics: Topic[];
  eventTypes: EventType[];
};

type Mode = "subscribe" | "resend";

function StatusMessage({
  state,
  statusRef,
}: {
  state: AnonymousSubscribeState;
  statusRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (state.ok) {
    return (
      <div
        ref={statusRef}
        className="rounded-lg border border-green-200 bg-green-50 px-4 py-5 text-sm text-green-800"
        role="status"
        aria-live="polite"
      >
        {state.message ?? "Проверете имейла си за потвърждение на абонамента."}
      </div>
    );
  }

  if (state.error) {
    return (
      <div
        ref={statusRef}
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        role="alert"
      >
        {state.error}
      </div>
    );
  }

  return null;
}

export default function AnonymousSubscribeForm({ cities, topics, eventTypes }: Props) {
  const [mode, setMode] = useState<Mode>("subscribe");
  const [successDismissed, setSuccessDismissed] = useState(false);
  const [subscribeState, subscribeAction, subscribePending] = useActionState(
    anonymousSubscribe,
    initialState
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendSubscribeConfirm,
    initialState
  );
  const statusRef = useRef<HTMLDivElement>(null);

  const state = mode === "subscribe" ? subscribeState : resendState;
  const pending = mode === "subscribe" ? subscribePending : resendPending;

  useEffect(() => {
    if (state.ok) {
      setSuccessDismissed(false);
    }
  }, [state.ok, state.message]);

  useEffect(() => {
    if ((state.ok && !successDismissed) || state.error) {
      statusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state.ok, state.error, state.message, successDismissed]);

  if (state.ok && !successDismissed) {
    return (
      <div className="space-y-4">
        <StatusMessage state={state} statusRef={statusRef} />
        <button
          type="button"
          onClick={() => {
            setSuccessDismissed(true);
            setMode("subscribe");
          }}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Обратно към формата
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {state.error ? (
        <div
          ref={statusRef}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </div>
      ) : null}

      {mode === "subscribe" ? (
        <>
          <form action={subscribeAction} className="space-y-5">
            <div>
              <label
                htmlFor="subscribe-email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Имейл <span className="text-red-500">*</span>
              </label>
              <input
                id="subscribe-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                className={inputCls}
                disabled={pending}
              />
            </div>

            <div>
              <label
                htmlFor="subscribe-city"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Град <span className="text-red-500">*</span>
              </label>
              <select
                id="subscribe-city"
                name="cityId"
                required
                defaultValue=""
                className={inputCls}
                disabled={pending}
              >
                <option value="" disabled>
                  Изберете град
                </option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.nameBg}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-gray-700">
              <input
                type="checkbox"
                name="includeOnline"
                defaultChecked
                className="mt-0.5 h-4 w-4 accent-blue-600"
                disabled={pending}
              />
              <span>
                Включи онлайн събития
                <span className="mt-0.5 block text-xs text-gray-500">
                  Ще получавате и събития от категория „Онлайн“.
                </span>
              </span>
            </label>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-gray-800">Допълнителни филтри</h3>
              <p className="mb-4 text-xs text-gray-500">По желание — оставете празно за всички.</p>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="subscribe-topic"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Тема
                  </label>
                  <select
                    id="subscribe-topic"
                    name="topicId"
                    defaultValue=""
                    className={inputCls}
                    disabled={pending}
                  >
                    <option value="">Всички</option>
                    {topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.nameBg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="subscribe-price"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Цена
                  </label>
                  <select
                    id="subscribe-price"
                    name="priceType"
                    defaultValue=""
                    className={inputCls}
                    disabled={pending}
                  >
                    <option value="">Всички</option>
                    <option value="FREE">Безплатно</option>
                    <option value="PAID">Платено</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="subscribe-event-type"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Вид събитие
                  </label>
                  <select
                    id="subscribe-event-type"
                    name="eventTypeId"
                    defaultValue=""
                    className={inputCls}
                    disabled={pending}
                  >
                    <option value="">Всички</option>
                    {eventTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.nameBg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="subscribe-language"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Език
                  </label>
                  <select
                    id="subscribe-language"
                    name="language"
                    defaultValue=""
                    className={inputCls}
                    disabled={pending}
                  >
                    <option value="">Всички</option>
                    <option value="BG">Български</option>
                    <option value="EN">Английски</option>
                    <option value="MIXED">Смесен</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
            >
              {pending ? "Изпращане…" : "Абонирай се"}
            </button>

            <p className="text-xs text-gray-500">
              Ще получите имейл с линк за потвърждение (валиден 7 дни). Абонаментът е безплатен и
              можете да се отпишете по всяко време.
            </p>
          </form>

          <p className="border-t border-gray-100 pt-4 text-sm text-gray-600">
            Вече се абонирахте, но не сте потвърдили?{" "}
            <button
              type="button"
              onClick={() => setMode("resend")}
              className="font-medium text-blue-600 hover:underline"
            >
              Изпрати отново потвърждение
            </button>
          </p>
        </>
      ) : (
        <>
          <div>
            <h2 className="mb-1 text-lg font-semibold text-gray-900">
              Изпрати отново потвърждение
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Въведете имейла, с който се абонирахте. Ще получите нов линк, валиден 7 дни.
            </p>
          </div>

          <form action={resendAction} className="space-y-5">
            <div>
              <label
                htmlFor="resend-email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Имейл <span className="text-red-500">*</span>
              </label>
              <input
                id="resend-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                className={inputCls}
                disabled={pending}
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
            >
              {pending ? "Изпращане…" : "Изпрати отново"}
            </button>
          </form>

          <p className="text-sm text-gray-600">
            <button
              type="button"
              onClick={() => setMode("subscribe")}
              className="font-medium text-blue-600 hover:underline"
            >
              ← Обратно към абонамент
            </button>
          </p>
        </>
      )}
    </div>
  );
}
