import { sendEmail } from "@/lib/email/brevo";
import { buildUnsubscribeEmailHtml } from "@/lib/email/templates/unsubscribe";

export async function sendUnsubscribeEmail(
  user: { email: string; name?: string | null },
  subscriptionName: string
) {
  return sendEmail({
    to: { email: user.email, name: user.name },
    subject: `Абонаментът „${subscriptionName}" е спрян`,
    htmlContent: buildUnsubscribeEmailHtml(subscriptionName),
  });
}
