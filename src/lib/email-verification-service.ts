import { prisma } from "@/lib/prisma";
import {
  createEmailVerificationToken,
  getEmailVerificationExpiry,
} from "@/lib/email-verification";
import { sendConfirmationEmail } from "@/lib/email/send-confirmation";

export async function issueEmailVerification(userId: string) {
  const token = createEmailVerificationToken();
  const expiresAt = getEmailVerificationExpiry();

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationToken: token,
      emailVerificationExpiresAt: expiresAt,
    },
  });

  const result = await sendConfirmationEmail(
    { email: user.email, name: user.name },
    token
  );

  return { user, result, token, expiresAt };
}

export async function verifyEmailByToken(token: string) {
  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: token },
  });

  if (!user) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (user.emailVerifiedAt) {
    return { ok: true as const, alreadyVerified: true as const, user };
  }

  if (
    !user.emailVerificationExpiresAt ||
    user.emailVerificationExpiresAt < new Date()
  ) {
    return { ok: false as const, reason: "expired" as const };
  }

  const verifiedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });

  return { ok: true as const, alreadyVerified: false as const, user: verifiedUser };
}

export async function resendEmailVerification(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.emailVerifiedAt) {
    return { sent: false as const };
  }

  await issueEmailVerification(user.id);
  return { sent: true as const };
}
