"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { runCrawlEvents, runManualEventImport } from "@/cron/crawl-events";
import type { CrawlAllResult, CrawlSourceResult } from "@/crawlers/types";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function pullOnlineEvents(): Promise<CrawlAllResult> {
  await requireAdmin();

  const result = await runCrawlEvents();

  revalidatePaths();
  return result;
}

export async function pullSourceEvents(sourceKey: string): Promise<CrawlAllResult> {
  await requireAdmin();

  const result = await runCrawlEvents(sourceKey);

  revalidatePaths();
  return result;
}

export async function importEventFromUrl(
  sourceKey: string,
  url: string
): Promise<CrawlSourceResult> {
  await requireAdmin();

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    throw new Error("Моля, въведете URL адрес на събитие.");
  }

  const result = await runManualEventImport(sourceKey, trimmedUrl);

  revalidatePaths();
  return result;
}

function revalidatePaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/admin/sources");
  revalidatePath("/events");
}
