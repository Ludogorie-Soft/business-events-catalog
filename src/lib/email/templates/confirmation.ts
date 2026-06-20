import { buildEmailVerificationUrl } from "@/lib/email-verification";
import { escapeHtml, wrapEmailHtml } from "@/lib/email/templates/layout";

export function buildConfirmationEmailHtml(
  name: string | null | undefined,
  token: string
) {
  const confirmUrl = buildEmailVerificationUrl(token);
  const greetingBg = name?.trim()
    ? `Здравейте, ${escapeHtml(name.trim())}!`
    : "Здравейте!";
  const greetingEn = name?.trim()
    ? `Hello, ${escapeHtml(name.trim())}!`
    : "Hello!";

  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#111827;">
      Потвърдете регистрацията си
    </h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
      ${greetingBg} Благодарим ви, че се регистрирахте в Бизнес Събития България.
    </p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">
      Моля, потвърдете имейл адреса си, за да активирате акаунта си. Линкът е валиден 7 дни.
    </p>
    <p style="margin:0 0 32px;">
      <a href="${confirmUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
        Потвърди регистрацията
      </a>
    </p>
    <p style="margin:0 0 32px;font-size:13px;line-height:1.6;color:#6b7280;word-break:break-all;">
      Ако бутонът не работи, копирайте този линк в браузъра си:<br />
      <a href="${confirmUrl}" style="color:#2563eb;text-decoration:none;">${confirmUrl}</a>
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />

    <h2 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#111827;">
      Confirm your registration
    </h2>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
      ${greetingEn} Thank you for registering with Business Events Bulgaria.
    </p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;">
      Please confirm your email address to activate your account. This link is valid for 7 days.
    </p>
    <p style="margin:0 0 24px;">
      <a href="${confirmUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
        Confirm registration
      </a>
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;word-break:break-all;">
      If the button does not work, copy and paste this link into your browser:<br />
      <a href="${confirmUrl}" style="color:#2563eb;text-decoration:none;">${confirmUrl}</a>
    </p>
  `;

  return wrapEmailHtml("Потвърдете регистрацията си / Confirm your registration", body);
}
