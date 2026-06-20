import { getAppUrl } from "@/lib/email/config";

export function wrapEmailHtml(title: string, bodyHtml: string) {
  const appUrl = getAppUrl();

  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:24px 28px;background:#1d4ed8;color:#ffffff;">
              <a href="${appUrl}" style="color:#ffffff;text-decoration:none;font-size:18px;font-weight:700;">
                Бизнес Събития България
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;line-height:1.6;">
              Получавате този имейл, защото имате акаунт в
              <a href="${appUrl}" style="color:#2563eb;text-decoration:none;">Бизнес Събития България</a>.
              Управлявайте абонаментите си от
              <a href="${appUrl}/profile/subscriptions" style="color:#2563eb;text-decoration:none;">профила си</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
