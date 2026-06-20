export function getAppUrl() {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getEmailSender() {
  const email = process.env.BREVO_SENDER_EMAIL ?? "noreply@example.com";
  const name = process.env.BREVO_SENDER_NAME ?? "Бизнес Събития България";
  return { email, name };
}
