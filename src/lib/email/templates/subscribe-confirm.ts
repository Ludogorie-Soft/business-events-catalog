import { getAppUrl } from "@/lib/email/config";
import { escapeHtml, wrapEmailHtml } from "@/lib/email/templates/layout";

export function buildSubscribeConfirmUrl(token: string) {
  return `${getAppUrl()}/subscribe/confirm?token=${encodeURIComponent(token)}`;
}

export function buildSubscribeConfirmEmailHtml({
  subscriptionName,
  token,
}: {
  subscriptionName: string;
  token: string;
}) {
  const confirmUrl = buildSubscribeConfirmUrl(token);

  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#111827;">
      Потвърдете абонамента си
    </h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
      Здравейте! Получихме заявка за имейл абонамент
      <strong>${escapeHtml(subscriptionName)}</strong> в Бизнес Събития България.
    </p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">
      Моля, потвърдете имейл адреса си, за да започнете да получавате седмичен дайджест със събития.
      Линкът е валиден 7 дни.
    </p>
    <p style="margin:0 0 32px;">
      <a href="${confirmUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
        Потвърди абонамента
      </a>
    </p>
    <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#6b7280;word-break:break-all;">
      Ако бутонът не работи, копирайте този линк в браузъра си:<br />
      <a href="${confirmUrl}" style="color:#2563eb;text-decoration:none;">${confirmUrl}</a>
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;">
      Ако не сте заявили този абонамент, можете да игнорирате този имейл.
    </p>
  `;

  return wrapEmailHtml("Потвърдете абонамента си", body);
}
