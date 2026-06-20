import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueEmailVerification } from "@/lib/email-verification-service";

export async function POST(req: NextRequest) {
  const { name, email: rawEmail, password } = await req.json();
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email и паролата са задължителни." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Паролата трябва да е поне 8 символа." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Вече съществува акаунт с този имейл." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  try {
    const { result } = await issueEmailVerification(user.id);
    if (!result.ok) {
      if ("skipped" in result && result.skipped) {
        console.warn("[email] Confirmation email skipped:", result.reason);
      } else if ("error" in result) {
        console.error("[email] Brevo rejected confirmation email:", result.error);
      }
    }
  } catch (error) {
    console.error("[email] Failed to send confirmation email:", error);
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
