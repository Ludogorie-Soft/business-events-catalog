"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SourceSuggestionStatus } from "@/generated/prisma/client";

export type SuggestSourceState = {
  ok: boolean;
  error?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function suggestSource(
  _prev: SuggestSourceState,
  formData: FormData
): Promise<SuggestSourceState> {
  const url = normalizeUrl(String(formData.get("url") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!url) {
    return {
      ok: false,
      error: "Моля, въведете валиден линк към източника.",
    };
  }

  if (notes && notes.length > 2000) {
    return {
      ok: false,
      error: "Коментарът е твърде дълъг (максимум 2000 символа).",
    };
  }

  await prisma.sourceSuggestion.create({
    data: { url, notes, status: "PENDING" },
  });

  revalidatePath("/admin/source-suggestions");
  revalidatePath("/admin");
  return { ok: true };
}

const ALLOWED_STATUSES: SourceSuggestionStatus[] = [
  "PENDING",
  "REJECTED",
  "IMPLEMENTED",
];

export async function updateSourceSuggestionStatus(
  id: string,
  status: SourceSuggestionStatus
) {
  await requireAdmin();

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error("Invalid status");
  }

  await prisma.sourceSuggestion.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/admin/source-suggestions");
  revalidatePath("/admin");
}
