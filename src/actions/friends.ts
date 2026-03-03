"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function orderedPair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

export async function getFriends() {
  const session = await getSession();
  if (!session) return [];
  const [id1, id2] = orderedPair(session.userId, "");
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userAId: session.userId }, { userBId: session.userId }],
    },
    include: {
      userA: { select: { id: true, firstName: true, lastName: true } },
      userB: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  return friendships.map((f) => (f.userAId === session.userId ? f.userB : f.userA));
}

export async function getUsersNotFriends() {
  const session = await getSession();
  if (!session) return [];
  const friendIds = new Set(
    (await getFriends()).map((u) => u.id)
  );
  friendIds.add(session.userId);
  const users = await prisma.user.findMany({
    where: { id: { notIn: [...friendIds] } },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return users;
}

export async function addFriend(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const userId = (formData.get("userId") ?? "").toString();
  if (!userId) return { error: "Missing user" };
  if (userId === session.userId) return { error: "Cannot add yourself" };
  const [userAId, userBId] = orderedPair(session.userId, userId);
  await prisma.friendship.upsert({
    where: {
      userAId_userBId: { userAId, userBId },
    },
    create: { userAId, userBId },
    update: {},
  });
  revalidatePath("/friends");
  return { success: true };
}

export async function removeFriend(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const userId = (formData.get("userId") ?? "").toString();
  if (!userId) return;
  const [userAId, userBId] = orderedPair(session.userId, userId);
  await prisma.friendship.deleteMany({
    where: { userAId, userBId },
  });
  revalidatePath("/friends");
  return { success: true };
}

export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  if (userId1 === userId2) return true;
  const [userAId, userBId] = orderedPair(userId1, userId2);
  const f = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  return !!f;
}
