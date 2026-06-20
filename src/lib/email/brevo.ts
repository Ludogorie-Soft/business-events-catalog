import { getEmailSender } from "@/lib/email/config";

export type EmailRecipient = {
  email: string;
  name?: string | null;
};

export type SendEmailParams = {
  to: EmailRecipient;
  subject: string;
  htmlContent: string;
};

export type SendEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; error: string };

export async function sendEmail({
  to,
  subject,
  htmlContent,
}: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    console.warn(`[email] BREVO_API_KEY not configured, skipping: ${subject} -> ${to.email}`);
    return { ok: false, skipped: true, reason: "BREVO_API_KEY not configured" };
  }

  const sender = getEmailSender();

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to.email, name: to.name ?? undefined }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[email] Brevo API error (${response.status}): ${body}`);
    return { ok: false, error: body || `Brevo API error (${response.status})` };
  }

  const data = (await response.json()) as { messageId?: string };
  return { ok: true, messageId: data.messageId };
}
