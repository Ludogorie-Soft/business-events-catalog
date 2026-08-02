/** Calendar week helpers for event filters (Monday–Sunday, Europe/Sofia). */

export const SOFIA_TZ = "Europe/Sofia";

export type WeekPreset = "current" | "next";

export function isWeekPreset(value: string | undefined | null): value is WeekPreset {
  return value === "current" || value === "next";
}

/** Today's calendar date in Europe/Sofia as YYYY-MM-DD. */
export function sofiaTodayIso(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SOFIA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Add calendar days to a YYYY-MM-DD string (date-only arithmetic). */
export function addCalendarDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Days since Monday for a YYYY-MM-DD calendar date (0 = Monday … 6 = Sunday).
 * Uses the civil date itself (not a timezone-shifted instant).
 */
function daysSinceMonday(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utcDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun … 6=Sat
  return utcDay === 0 ? 6 : utcDay - 1;
}

/**
 * Resolve a relative week preset to inclusive Monday–Sunday dates (YYYY-MM-DD)
 * in the Europe/Sofia calendar.
 *
 * Example: on Sunday 2026-08-02, next week is 2026-08-03 … 2026-08-09.
 */
export function resolveWeekRange(
  week: WeekPreset,
  now = new Date()
): { dateFrom: string; dateTo: string } {
  const today = sofiaTodayIso(now);
  const thisMonday = addCalendarDays(today, -daysSinceMonday(today));
  const monday = week === "next" ? addCalendarDays(thisMonday, 7) : thisMonday;
  return {
    dateFrom: monday,
    dateTo: addCalendarDays(monday, 6),
  };
}
