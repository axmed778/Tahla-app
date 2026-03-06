"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getConversations() {
  const session = await getSession();
  if (!session) return [];
  const participants = await prisma.conversationParticipant.findMany({
    where: { userId: session.userId },
    include: {
      conversation: {
        include: {
          participants: {
            where: { userId: { not: session.userId } },
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
  });
  return participants.map((p) => ({
    id: p.conversation.id,
    otherUser: p.conversation.participants[0]?.user ?? null,
    lastMessage: p.conversation.messages[0] ?? null,
  })).filter((c) => c.otherUser);
}

export async function getOrCreateConversation(otherUserId: string) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  if (otherUserId === session.userId) return { error: "Cannot message yourself" };
  const existing = await prisma.conversationParticipant.findFirst({
    where: { userId: session.userId },
    include: {
      conversation: {
        include: {
          participants: { select: { userId: true } },
        },
      },
    },
  });
  if (existing) {
    const otherInConv = existing.conversation.participants.some((p) => p.userId === otherUserId);
    if (otherInConv) return { conversationId: existing.conversation.id };
  }
  const allConvs = await prisma.conversation.findMany({
    include: {
      participants: { select: { userId: true } },
    },
  });
  const found = allConvs.find(
    (c) =>
      c.participants.some((p) => p.userId === session.userId) &&
      c.participants.some((p) => p.userId === otherUserId)
  );
  if (found) return { conversationId: found.id };
  const conv = await prisma.conversation.create({
    data: {
      participants: {
        create: [
          { userId: session.userId },
          { userId: otherUserId },
        ],
      },
    },
  });
  return { conversationId: conv.id };
}

export async function getMessages(conversationId: string) {
  const session = await getSession();
  if (!session) return [];
  const part = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: session.userId } },
  });
  if (!part) return [];
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function sendMessage(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const conversationId = (formData.get("conversationId") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  if (!conversationId || !content) return { error: "Missing data" };
  const part = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: session.userId } },
  });
  if (!part) return { error: "Not in conversation" };
  await prisma.message.create({
    data: { conversationId, senderId: session.userId, content },
  });
  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
  return { success: true };
}
