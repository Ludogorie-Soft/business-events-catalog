import { NextRequest, NextResponse } from "next/server";
import { runCrawlEvents } from "@/cron/crawl-events";
import { unauthorizedCronResponse, validateCronRequest } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  if (!validateCronRequest(request)) {
    return unauthorizedCronResponse();
  }

  const sourceKey = request.nextUrl.searchParams.get("source") ?? undefined;
  const result = await runCrawlEvents(sourceKey);
  return NextResponse.json(result);
}
