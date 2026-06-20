import type {
  City,
  Event,
  EventType,
  Venue,
} from "@/generated/prisma/client";
import { getAppUrl } from "@/lib/email/config";
import { escapeHtml, wrapEmailHtml } from "@/lib/email/templates/layout";

type DigestEvent = Event & {
  city: City;
  eventType: EventType;
  venue: Venue | null;
};

const locationLabels: Record<string, string> = {
  PHYSICAL: "На живо",
  ONLINE: "Онлайн",
  HYBRID: "Хибридно",
};

const priceLabels: Record<string, string> = {
  FREE: "Безплатно",
  PAID: "Платено",
  UNKNOWN: "",
};

function formatEventDate(startAt: Date) {
  const date = new Date(startAt).toLocaleDateString("bg-BG", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = new Date(startAt).toLocaleTimeString("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

function formatEventLocation(event: DigestEvent) {
  if (event.locationType === "ONLINE") return "Онлайн";
  if (event.venue?.name) return `${event.venue.name}, ${event.city.nameBg}`;
  return event.city.nameBg;
}

function renderEventItem(event: DigestEvent) {
  const appUrl = getAppUrl();
  const price =
    event.priceType !== "UNKNOWN" ? priceLabels[event.priceType] : null;

  return `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;font-size:12px;color:#2563eb;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">
          ${escapeHtml(event.eventType.nameBg)} · ${locationLabels[event.locationType]}
          ${price ? ` · ${price}` : ""}
        </p>
        <h2 style="margin:0 0 8px;font-size:18px;line-height:1.4;">
          <a href="${appUrl}/events/${event.slug}" style="color:#111827;text-decoration:none;">
            ${escapeHtml(event.title)}
          </a>
        </h2>
        ${
          event.shortDescription
            ? `<p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#6b7280;">${escapeHtml(event.shortDescription)}</p>`
            : ""
        }
        <p style="margin:0;font-size:14px;line-height:1.5;color:#374151;">
          📅 ${escapeHtml(formatEventDate(event.startAt))}<br />
          📍 ${escapeHtml(formatEventLocation(event))}
        </p>
      </td>
    </tr>
  `;
}

export function buildDigestEmailHtml({
  subscriptionName,
  events,
  digestType,
}: {
  subscriptionName: string;
  events: DigestEvent[];
  digestType: "daily" | "weekly";
}) {
  const appUrl = getAppUrl();
  const title =
    digestType === "daily"
      ? `Ежедневен дайджест: ${subscriptionName}`
      : `Седмичен дайджест: ${subscriptionName}`;
  const intro =
    digestType === "daily"
      ? "Ето новите събития, които отговарят на вашия абонамент:"
      : "Ето събитията за тази седмица, които отговарят на вашия абонамент:";

  const body = `
    <h1 style="margin:0 0 8px;font-size:24px;line-height:1.3;color:#111827;">
      ${escapeHtml(title)}
    </h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">
      ${intro}
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${events.map(renderEventItem).join("")}
    </table>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#6b7280;">
      <a href="${appUrl}/events" style="color:#2563eb;text-decoration:none;">Виж всички събития</a>
      ·
      <a href="${appUrl}/profile/subscriptions" style="color:#2563eb;text-decoration:none;">Управление на абонаменти</a>
    </p>
  `;

  return wrapEmailHtml(title, body);
}
