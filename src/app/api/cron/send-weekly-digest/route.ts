import { NextRequest, NextResponse } from "next/server";
import { runWeeklyDigest } from "@/cron/send-weekly-digest";
import { unauthorizedCronResponse, validateCronRequest } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  if (!validateCronRequest(request)) {
    return unauthorizedCronResponse();
  }

  const result = await runWeeklyDigest();
  return NextResponse.json(result);
}
