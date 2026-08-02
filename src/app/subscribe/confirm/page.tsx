import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Потвърждение на абонамент",
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function SubscribeConfirmPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Result
        title="Невалиден линк"
        message="Линкът за потвърждение липсва или е непълен."
      />
    );
  }

  const subscription = await prisma.subscription.findFirst({
    where: { confirmToken: token },
    include: { user: true },
  });

  if (!subscription) {
    return (
      <Result
        title="Невалиден линк"
        message="Линкът за потвърждение е невалиден или вече е използван."
      />
    );
  }

  if (
    subscription.confirmTokenExpiresAt &&
    subscription.confirmTokenExpiresAt.getTime() < Date.now()
  ) {
    return (
      <Result
        title="Изтекъл линк"
        message="Линкът за потвърждение е изтекъл. Можете да изпратите нов от страницата за абонамент."
        ctaHref="/subscribe"
        ctaLabel="Изпрати отново потвърждение"
      />
    );
  }

  if (!subscription.active) {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          active: true,
          confirmToken: null,
          confirmTokenExpiresAt: null,
        },
      });

      if (!subscription.user.emailVerifiedAt) {
        await tx.user.update({
          where: { id: subscription.userId },
          data: { emailVerifiedAt: new Date() },
        });
      }
    });
  } else {
    // Already confirmed — clear any leftover token
    if (subscription.confirmToken) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { confirmToken: null, confirmTokenExpiresAt: null },
      });
    }
  }

  return (
    <Result
      title="Абонаментът е потвърден"
      message={`Вече ще получавате седмичен дайджест за „${subscription.name}".`}
      ctaHref="/events"
      ctaLabel="Разгледай събития"
      success
    />
  );
}

function Result({
  title,
  message,
  ctaHref = "/subscribe",
  ctaLabel = "Към абонамент",
  success = false,
}: {
  title: string;
  message: string;
  ctaHref?: string;
  ctaLabel?: string;
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
        <Link
          href={ctaHref}
          className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
