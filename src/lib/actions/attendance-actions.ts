"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { AttendanceStatus } from "@/generated/prisma/client";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthenticated");
  return session.user.id;
}

export async function setAttendance(
  eventId: string,
  eventSlug: string,
  status: AttendanceStatus
) {
  const userId = await requireUser();

  await prisma.eventAttendance.upsert({
    where: { userId_eventId: { userId, eventId } },
    create: { userId, eventId, status },
    update: { status },
  });

  revalidatePath(`/events/${eventSlug}`);
  revalidatePath("/events");
  revalidatePath("/profile/events");
}

export async function removeAttendance(eventId: string, eventSlug: string) {
  const userId = await requireUser();

  await prisma.eventAttendance.deleteMany({ where: { userId, eventId } });

  revalidatePath(`/events/${eventSlug}`);
  revalidatePath("/events");
  revalidatePath("/profile/events");
}
