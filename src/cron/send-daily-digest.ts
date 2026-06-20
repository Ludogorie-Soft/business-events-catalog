import {
  getActiveSubscriptionsByFrequency,
  sendDigestForSubscription,
} from "@/lib/email/send-digest";

export async function runDailyDigest() {
  const subscriptions = await getActiveSubscriptionsByFrequency("DAILY");
  const results = [];

  for (const subscription of subscriptions) {
    results.push(await sendDigestForSubscription(subscription, "daily"));
  }

  return {
    processed: subscriptions.length,
    sent: results.filter((r) => r.status === "sent").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };
}

export async function runWeeklyDigest() {
  const subscriptions = await getActiveSubscriptionsByFrequency("WEEKLY");
  const results = [];

  for (const subscription of subscriptions) {
    results.push(await sendDigestForSubscription(subscription, "weekly"));
  }

  return {
    processed: subscriptions.length,
    sent: results.filter((r) => r.status === "sent").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };
}
