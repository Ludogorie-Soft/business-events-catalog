import { getAppUrl } from "@/lib/email/config";
import { escapeHtml, wrapEmailHtml } from "@/lib/email/templates/layout";

export function buildWelcomeEmailHtml(name?: string | null) {
  const appUrl = getAppUrl();
  const greeting = name?.trim() ? `Здравейте, ${escapeHtml(name.trim())}!` : "Здравейте!";

  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#111827;">
      Добре дошли в Бизнес Събития България
    </h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
      ${greeting} Благодарим ви, че се регистрирахте.
    </p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">
      Открийте конференции, уъркшопи и нетуъркинг събития в България.
      Създайте абонамент, за да получавате ежедневни или седмични известия по вашите критерии.
    </p>
    <p style="margin:0 0 24px;">
      <a href="${appUrl}/events" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
        Разгледай събития
      </a>
    </p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">
      Създайте първия си абонамент от
      <a href="${appUrl}/profile/subscriptions" style="color:#2563eb;text-decoration:none;">профила си</a>.
    </p>
  `;

  return wrapEmailHtml("Добре дошли", body);
}
