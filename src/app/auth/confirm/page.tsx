import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifyEmailByToken } from "@/lib/email-verification-service";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";

export const metadata: Metadata = {
  title: "Потвърждение на имейл",
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ConfirmEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <ConfirmResult
        variant="error"
        title="Невалиден линк"
        message="Линкът за потвърждение липсва или е непълен."
      />
    );
  }

  const result = await verifyEmailByToken(token);

  if (!result.ok && result.reason === "expired") {
    return (
      <ConfirmResult
        variant="error"
        title="Изтекъл линк"
        message="Линкът за потвърждение е изтекъл. Моля, поискайте нов от страницата за вход."
        showResendHint
      />
    );
  }

  if (!result.ok) {
    return (
      <ConfirmResult
        variant="error"
        title="Невалиден линк"
        message="Линкът за потвърждение е невалиден или вече е използван."
        showResendHint
      />
    );
  }

  if (!result.alreadyVerified) {
    void sendWelcomeEmail({
      email: result.user.email,
      name: result.user.name,
    }).catch((error) => {
      console.error("[email] Failed to send welcome email:", error);
    });
  }

  redirect("/auth/login?confirmed=1");
}

function ConfirmResult({
  variant,
  title,
  message,
  showResendHint = false,
}: {
  variant: "error";
  title: string;
  message: string;
  showResendHint?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200 text-center">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mb-6 text-gray-600">{message}</p>
      {showResendHint && (
        <p className="mb-6 text-sm text-gray-500">
          Можете да използвате бутона „Изпрати отново потвърждение“ на страницата за вход.
        </p>
      )}
      <Link
        href="/auth/login"
        className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
      >
        Към вход
      </Link>
    </div>
  );
}
