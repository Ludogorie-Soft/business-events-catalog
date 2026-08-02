import Link from "next/link";
import type { Metadata } from "next";
import { sendUnsubscribeEmail } from "@/lib/email/send-unsubscribe";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Отписване от абонамент",
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Result
        title="Невалиден линк"
        message="Линкът за отписване липсва или е непълен."
      />
    );
  }

  const subscription = await prisma.subscription.findFirst({
    where: { unsubscribeToken: token },
    include: { user: true },
  });

  if (!subscription) {
    return (
      <Result
        title="Невалиден линк"
        message="Линкът за отписване е невалиден или абонаментът вече не съществува."
      />
    );
  }

  if (subscription.active) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { active: false },
    });

    void sendUnsubscribeEmail(subscription.user, subscription.name).catch((error) => {
      console.error("[email] Failed to send unsubscribe email:", error);
    });
  }

  return (
    <Result
      title="Отписахте се успешно"
      message={`Абонаментът „${subscription.name}" вече няма да получава имейл известия.`}
      success
    />
  );
}

function Result({
  title,
  message,
  success = false,
}: {
  title: string;
  message: string;
  success?: boolean;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div
        className={`rounded-2xl bg-white p-8 shadow-sm ring-1 ${
          success ? "ring-green-200" : "ring-gray-200"
        }`}
      >
        <h1 className="mb-4 text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mb-6 text-gray-600">{message}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/subscribe"
            className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Нов абонамент
          </Link>
          <Link
            href="/events"
            className="inline-block rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Към събитията
          </Link>
        </div>
      </div>
    </div>
  );
}
