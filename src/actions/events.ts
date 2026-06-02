"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { uploadImageToCloudinary } from "@/lib/file-upload";
import { createNotification } from "@/actions/notifications";
import { eventNameSchema, eventPlaceSchema } from "@/lib/validations";
import { z } from "zod";

const uuidSchema = z.string().uuid();

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
  const session = await getSession();
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
  if (!event) return null;
  if (!session) return null;
  const isCreator = event.createdById === session.userId;
  const isParticipant = event.participants.some((p) => p.userId === session.userId);
  if (!isCreator && !isParticipant) return null;
  return event;
}

export async function createEvent(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const nameRaw = (formData.get("name") ?? "").toString().trim();
  const dateStr = (formData.get("date") ?? "").toString();
  const placeRaw = (formData.get("place") ?? "").toString().trim() || undefined;
  const userIdsRaw = (formData.get("userIds") ?? "").toString().split(",").filter(Boolean);
  // Only accept well-formed UUIDs to avoid unexpected Prisma errors.
  const userIds = userIdsRaw.filter((id) => uuidSchema.safeParse(id).success);
  const nameParsed = eventNameSchema.safeParse(nameRaw);
  if (!nameParsed.success) return { error: nameParsed.error.issues[0]?.message ?? "Invalid event name" };
  const placeParsed = eventPlaceSchema.safeParse(placeRaw);
  if (!placeParsed.success) return { error: placeParsed.error.issues[0]?.message ?? "Invalid place" };
  const name = nameParsed.data;
  const place = placeParsed.data ?? null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { error: "Valid date is required" };

  let imageUrl: string | null = null;
  const photo = formData.get("photo") as File | null;
  if (photo?.size && photo.size <= MAX_SIZE && ALLOWED_TYPES.includes(photo.type)) {
    const bytes = Buffer.from(await photo.arrayBuffer());
    const uploaded = await uploadImageToCloudinary(bytes, photo.type, "events");
    if ("url" in uploaded) {
      imageUrl = uploaded.url;
    }
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
  const allUserIds = Array.from(new Set([session.userId, ...userIds]));
  for (const uid of allUserIds) {
    await prisma.eventParticipant.upsert({
      where: { eventId_userId: { eventId: event.id, userId: uid } },
      create: { eventId: event.id, userId: uid },
      update: {},
    });
  }
  for (const uid of userIds) {
    if (uid !== session.userId) {
      await createNotification(uid, "EVENT_INVITE", {
        actorId: session.userId,
        meta: { eventId: event.id, eventName: name },
      });
    }
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
