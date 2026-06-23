import { getCrawler } from "@/crawlers";
import { importCrawledEvents } from "@/crawlers/import-events";
import type { CrawlAllResult, CrawlSourceResult } from "@/crawlers/types";
import { prisma } from "@/lib/prisma";

async function crawlSource(source: {
  id: string;
  sourceKey: string;
  name: string;
}): Promise<CrawlSourceResult> {
  const crawler = getCrawler(source.sourceKey);
  const startedAt = new Date();

  const crawlRun = await prisma.crawlRun.create({
    data: {
      sourceId: source.id,
      status: "RUNNING",
      startedAt,
    },
  });

  if (!crawler) {
    const errorMessage = `No crawler registered for sourceKey: ${source.sourceKey}`;
    await prisma.$transaction([
      prisma.crawlRun.update({
        where: { id: crawlRun.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          errorMessage,
        },
      }),
      prisma.source.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: new Date(),
          lastError: errorMessage,
        },
      }),
    ]);

    return {
      sourceKey: source.sourceKey,
      status: "failed",
      eventsFound: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      errorMessage,
    };
  }

  try {
    const events = await crawler.crawl();
    const importResult = await importCrawledEvents(source.id, events);
    const finishedAt = new Date();

    await prisma.$transaction([
      prisma.crawlRun.update({
        where: { id: crawlRun.id },
        data: {
          status: "SUCCESS",
          finishedAt,
          eventsFound: importResult.eventsFound,
          eventsCreated: importResult.eventsCreated,
          eventsUpdated: importResult.eventsUpdated,
        },
      }),
      prisma.source.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: finishedAt,
          lastSuccessAt: finishedAt,
          lastEventsFoundCount: importResult.eventsFound,
          lastError: null,
        },
      }),
    ]);

    return {
      sourceKey: source.sourceKey,
      status: "success",
      ...importResult,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown crawler error";
    const finishedAt = new Date();

    await prisma.$transaction([
      prisma.crawlRun.update({
        where: { id: crawlRun.id },
        data: {
          status: "FAILED",
          finishedAt,
          errorMessage,
        },
      }),
      prisma.source.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: finishedAt,
          lastError: errorMessage,
        },
      }),
    ]);

    return {
      sourceKey: source.sourceKey,
      status: "failed",
      eventsFound: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      errorMessage,
    };
  }
}

export async function runCrawlEvents(sourceKey?: string): Promise<CrawlAllResult> {
  const sources = await prisma.source.findMany({
    where: {
      active: true,
      ...(sourceKey ? { sourceKey } : {}),
    },
    orderBy: { name: "asc" },
  });

  const results: CrawlSourceResult[] = [];

  for (const source of sources) {
    results.push(await crawlSource(source));
  }

  return {
    processed: sources.length,
    succeeded: results.filter((result) => result.status === "success").length,
    failed: results.filter((result) => result.status === "failed").length,
    eventsFound: results.reduce((sum, result) => sum + result.eventsFound, 0),
    eventsCreated: results.reduce((sum, result) => sum + result.eventsCreated, 0),
    eventsUpdated: results.reduce((sum, result) => sum + result.eventsUpdated, 0),
    results,
  };
}
