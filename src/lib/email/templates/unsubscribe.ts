import { getAppUrl } from "@/lib/email/config";
import { escapeHtml, wrapEmailHtml } from "@/lib/email/templates/layout";

export function buildUnsubscribeEmailHtml(
  subscriptionName: string,
  options?: { hasPasswordAccount?: boolean }
) {
  const appUrl = getAppUrl();
  const hasPasswordAccount = options?.hasPasswordAccount ?? true;

  const manageCopy = hasPasswordAccount
    ? "Можете по всяко време да активирате отново абонамента или да създадете нов от профила си."
    : "Можете по всяко време да се абонирате отново от страницата за абонамент.";

  const manageHref = hasPasswordAccount
    ? `${appUrl}/profile/subscriptions`
    : `${appUrl}/subscribe`;

  const manageLabel = hasPasswordAccount
    ? "Управление на абонаменти"
    : "Нов абонамент";

  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#111827;">
      Абонаментът е спрян
    </h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
      Потвърждаваме, че абонаментът <strong>${escapeHtml(subscriptionName)}</strong> вече няма да получава имейл известия.
    </p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">
      ${manageCopy}
    </p>
    <p style="margin:0;">
      <a href="${manageHref}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
        ${manageLabel}
      </a>
    </p>
  `;

  return wrapEmailHtml("Абонамент спрян", body);
}

