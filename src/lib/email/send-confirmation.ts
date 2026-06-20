import { sendEmail } from "@/lib/email/brevo";
import { buildConfirmationEmailHtml } from "@/lib/email/templates/confirmation";

export async function sendConfirmationEmail(
  user: { email: string; name?: string | null },
  token: string
) {
  return sendEmail({
    to: { email: user.email, name: user.name },
    subject:
      "Потвърдете регистрацията си / Confirm your registration – Бизнес Събития България",
    htmlContent: buildConfirmationEmailHtml(user.name, token),
  });
}
