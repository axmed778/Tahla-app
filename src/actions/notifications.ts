"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { NotificationMeta, NotificationType } from "@/lib/notifications-types";

/** Called from other server actions when something notifiable happens. */
export async function createNotification(
  recipientUserId: string,
  type: NotificationType,
  options: { actorId?: string; meta?: NotificationMeta } = {}
): Promise<void> {
  const { actorId, meta } = options;
  await prisma.notification.create({
    data: {
      userId: recipientUserId,
      type,
      actorId: actorId ?? null,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });
}

import type { NotificationItem } from "@/lib/notifications-types";

export async function getNotifications(limit = 50): Promise<NotificationItem[]> {
  const session = await getSession();
  if (!session) return [];
  const list = await prisma.notification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { firstName: true, lastName: true } },
    },
  });
  return list.map((n) => ({
    id: n.id,
    type: n.type,
    readAt: n.readAt,
    createdAt: n.createdAt,
    actorName: n.actor ? `${n.actor.firstName} ${n.actor.lastName}` : null,
    meta: n.meta ? (JSON.parse(n.meta) as NotificationMeta) : null,
  }));
}

export async function getUnreadCount(): Promise<number> {
  const session = await getSession();
  if (!session) return 0;
  return prisma.notification.count({
    where: { userId: session.userId, readAt: null },
  });
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.userId },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await prisma.notification.updateMany({
    where: { userId: session.userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
}
