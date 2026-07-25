"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  suggestSource,
  type SuggestSourceState,
} from "@/lib/actions/source-suggestion-actions";

const initialState: SuggestSourceState = { ok: false };

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export default function SourceSuggestionForm() {
  const [state, action, pending] = useActionState(suggestSource, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <section className="mt-12 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
      <h2 className="mb-2 text-xl font-bold text-gray-900">
        Предложи нов източник за бизнес събития
      </h2>
      <p className="mb-6 text-sm text-gray-600">
        Ако знаете сайт със събития, които липсват в каталога, споделете го с
        нас.
      </p>

      {state.ok ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Благодарим! Получихме вашето предложение и ще го прегледаме.
        </div>
      ) : null}

      {state.error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <form ref={formRef} action={action} className="max-w-xl space-y-4">
        <div>
          <label
            htmlFor="source-url"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Линк към източник на събития{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            id="source-url"
            name="url"
            type="url"
            required
            placeholder="https://example.com/events"
            className={inputCls}
            disabled={pending}
          />
        </div>

        <div>
          <label
            htmlFor="source-notes"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Коментар / бележки{" "}
            <span className="font-normal text-gray-400">(по желание)</span>
          </label>
          <textarea
            id="source-notes"
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder="Напр. какъв тип събития има на сайта"
            className={inputCls}
            disabled={pending}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? "Изпращане…" : "Изпрати предложение"}
        </button>
      </form>
    </section>
  );
}
