import type { CrawledEvent } from "@/crawlers/types";

export function isUpcomingEvent(event: CrawledEvent, now = new Date()) {
  const lastMoment = event.endAt ?? event.startAt;
  return lastMoment >= now;
}

export function filterUpcomingEvents(events: CrawledEvent[], now = new Date()) {
  return events.filter((event) => isUpcomingEvent(event, now));
}
