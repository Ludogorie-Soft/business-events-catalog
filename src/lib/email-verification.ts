import { randomBytes } from "crypto";

export const EMAIL_VERIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createEmailVerificationToken() {
  return randomBytes(32).toString("hex");
}

export function getEmailVerificationExpiry(from = new Date()) {
  return new Date(from.getTime() + EMAIL_VERIFICATION_TTL_MS);
}

export function buildEmailVerificationUrl(token: string) {
  const appUrl = (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  return `${appUrl}/auth/confirm?token=${encodeURIComponent(token)}`;
}
