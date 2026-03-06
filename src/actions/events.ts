"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function getEventsForCurrentUser() {
  const session = await getSession();
  if (!session) return [];
  const participants = await prisma.eventParticipant.findMany({
    where: { userId: session.userId },
    select: { eventId: true },
  });
  const eventIds = participants.map((p) => p.eventId);
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { createdById: session.userId },
        { id: { in: eventIds } },
      ],
    },
    orderBy: { date: "asc" },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { participants: true } },
    },
  });
  return events;
}

export async function getEvent(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  return event;
}

export async function createEvent(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const name = (formData.get("name") ?? "").toString().trim();
  const dateStr = (formData.get("date") ?? "").toString();
  const place = (formData.get("place") ?? "").toString().trim() || null;
  const userIds = (formData.get("userIds") ?? "").toString().split(",").filter(Boolean);
  if (!name) return { error: "Event name is required" };
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { error: "Valid date is required" };

  let imageUrl: string | null = null;
  const photo = formData.get("photo") as File | null;
  if (photo?.size && photo.size <= MAX_SIZE && ALLOWED_TYPES.includes(photo.type)) {
    const ext = photo.type === "image/jpeg" ? ".jpg" : photo.type === "image/png" ? ".png" : ".webp";
    const dir = path.join(process.cwd(), "public", "uploads", "events");
    await mkdir(dir, { recursive: true });
    const filename = `event-${Date.now()}${ext}`;
    const filepath = path.join(dir, filename);
    await writeFile(filepath, Buffer.from(await photo.arrayBuffer()));
    imageUrl = `/uploads/events/${filename}`;
  }

  const event = await prisma.event.create({
    data: {
      name,
      date,
      place,
      imageUrl,
      createdById: session.userId,
    },
  });
  const allUserIds = new Set([session.userId, ...userIds]);
  for (const uid of allUserIds) {
    await prisma.eventParticipant.upsert({
      where: { eventId_userId: { eventId: event.id, userId: uid } },
      create: { eventId: event.id, userId: uid },
      update: {},
    });
  }
  revalidatePath("/events");
  redirect(`/events/${event.id}`);
}

export async function canViewEventParticipantList(eventId: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  const p = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId, userId: session.userId } },
  });
  return !!p;
}
