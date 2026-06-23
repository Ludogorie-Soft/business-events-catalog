"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

export async function toggleSourceActive(sourceId: string) {
  await requireAdmin();

  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error("Source not found");

  await prisma.source.update({
    where: { id: sourceId },
    data: { active: !source.active },
  });

  revalidatePath("/admin/sources");
  revalidatePath("/admin");
}
