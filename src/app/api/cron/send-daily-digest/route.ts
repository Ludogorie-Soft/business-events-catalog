import { NextRequest, NextResponse } from "next/server";
import { runDailyDigest } from "@/cron/send-daily-digest";
import { unauthorizedCronResponse, validateCronRequest } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  if (!validateCronRequest(request)) {
    return unauthorizedCronResponse();
  }

  const result = await runDailyDigest();
  return NextResponse.json(result);
}
