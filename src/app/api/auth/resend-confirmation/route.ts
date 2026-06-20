import { NextRequest, NextResponse } from "next/server";
import { resendEmailVerification } from "@/lib/email-verification-service";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { error: "Имейлът е задължителен." },
      { status: 400 }
    );
  }

  try {
    await resendEmailVerification(email.trim().toLowerCase());
  } catch (error) {
    console.error("[email] Failed to resend confirmation email:", error);
  }

  return NextResponse.json({
    success: true,
    message:
      "Ако има непотвърден акаунт с този имейл, изпратихме нов линк за потвърждение.",
  });
}
