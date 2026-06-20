import { NextRequest } from "next/server";

export function validateCronRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return false;
  }

  return true;
}

export function unauthorizedCronResponse() {
  return new Response("Unauthorized", { status: 401 });
}
