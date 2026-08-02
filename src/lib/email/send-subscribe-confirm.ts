import { sendEmail } from "@/lib/email/brevo";
import { buildSubscribeConfirmEmailHtml } from "@/lib/email/templates/subscribe-confirm";

export async function sendSubscribeConfirmEmail(
  user: { email: string; name?: string | null },
  subscriptionName: string,
  token: string
) {
  return sendEmail({
    to: { email: user.email, name: user.name },
    subject: `Потвърдете абонамента „${subscriptionName}"`,
    htmlContent: buildSubscribeConfirmEmailHtml({ subscriptionName, token }),
  });
}
