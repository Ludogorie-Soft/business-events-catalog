"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { EMAIL_NOT_VERIFIED_CODE } from "@/lib/auth-errors";

function getSignInErrorMessage(result: {
  error?: string | null;
  code?: string | null;
}) {
  if (result.code === EMAIL_NOT_VERIFIED_CODE) {
    return "Моля, потвърдете имейла си преди да влезете. Проверете пощата си или използвайте бутона „Изпрати отново потвърждение“.";
  }

  if (result.error === "CredentialsSignin") {
    return "Невалиден имейл или парола.";
  }

  return "Невалиден имейл или парола.";
}

function isUnverifiedEmailError(result: { code?: string | null }) {
  return result.code === EMAIL_NOT_VERIFIED_CODE;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/events";
  const registered = searchParams.get("registered") === "1";
  const confirmed = searchParams.get("confirmed") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorIsUnverified, setErrorIsUnverified] = useState(false);
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setErrorIsUnverified(false);
    setInfo("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setErrorIsUnverified(isUnverifiedEmailError(result));
      setError(getSignInErrorMessage(result));
      setPassword("");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  async function handleResendConfirmation() {
    if (!email.trim()) {
      setError("Въведете имейла си, за да изпратим отново потвърждението.");
      return;
    }

    setError("");
    setErrorIsUnverified(false);
    setInfo("");
    setResendLoading(true);

    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Възникна грешка.");
      } else {
        setInfo(data.message);
      }
    } catch {
      setError("Възникна грешка. Моля, опитайте отново.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Вход</h1>

      {registered && (
        <p className="mb-4 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Регистрацията е успешна. Проверете имейла си и потвърдете акаунта си, за да влезете.
        </p>
      )}

      {confirmed && (
        <p className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          Имейлът ви е потвърден успешно. Вече можете да влезете.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p
            className={`rounded-md px-4 py-3 text-sm ${
              errorIsUnverified
                ? "bg-amber-50 text-amber-900"
                : "bg-red-50 text-red-700"
            }`}
          >
            {error}
          </p>
        )}

        {info && (
          <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
            {info}
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Имейл
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Парола
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading ? "Влизане..." : "Вход"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleResendConfirmation}
        disabled={resendLoading}
        className="mt-4 w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
      >
        {resendLoading ? "Изпращане..." : "Изпрати отново потвърждение"}
      </button>

      <p className="mt-6 text-center text-sm text-gray-500">
        Нямате акаунт?{" "}
        <Link href="/auth/register" className="font-medium text-blue-600 hover:underline">
          Регистрация
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
