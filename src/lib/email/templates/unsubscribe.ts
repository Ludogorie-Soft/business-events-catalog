import { getAppUrl } from "@/lib/email/config";
import { escapeHtml, wrapEmailHtml } from "@/lib/email/templates/layout";

export function buildUnsubscribeEmailHtml(subscriptionName: string) {
  const appUrl = getAppUrl();

  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#111827;">
      Абонаментът е спрян
    </h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
      Потвърждаваме, че абонаментът <strong>${escapeHtml(subscriptionName)}</strong> вече няма да получава имейл известия.
    </p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">
      Можете по всяко време да активирате отново абонамента или да създадете нов от профила си.
    </p>
    <p style="margin:0;">
      <a href="${appUrl}/profile/subscriptions" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
        Управление на абонаменти
      </a>
    </p>
  `;

  return wrapEmailHtml("Абонамент спрян", body);
}
