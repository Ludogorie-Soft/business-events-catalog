import type { Metadata } from "next";
import PullEventsButton from "@/components/admin/PullEventsButton";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Администрация" };

export default async function AdminDashboardPage() {
  const [publishedCount, draftCount, sourceCount] = await Promise.all([
    prisma.event.count({ where: { status: "PUBLISHED" } }),
    prisma.event.count({ where: { status: "DRAFT" } }),
    prisma.source.count({ where: { active: true } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Табло</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Публикувани събития</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{publishedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Чернови</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{draftCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Активни източници</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{sourceCount}</p>
        </div>
      </div>

      <PullEventsButton />
    </div>
  );
}
