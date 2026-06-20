import { sendEmail } from "@/lib/email/brevo";
import { buildWelcomeEmailHtml } from "@/lib/email/templates/welcome";

export async function sendWelcomeEmail(user: {
  email: string;
  name?: string | null;
}) {
  return sendEmail({
    to: { email: user.email, name: user.name },
    subject: "Добре дошли в Бизнес Събития България",
    htmlContent: buildWelcomeEmailHtml(user.name),
  });
}
