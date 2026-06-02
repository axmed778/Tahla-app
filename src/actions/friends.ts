"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/actions/notifications";

function orderedPair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

export async function getFriends() {
  const session = await getSession();
  if (!session) return [];
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

/** Users who are not friends and have no pending request in either direction. */
export async function getUsersNotFriends() {
  const session = await getSession();
  if (!session) return [];
  const friendIds = new Set((await getFriends()).map((u) => u.id));
  friendIds.add(session.userId);
  const pendingFromMe = await prisma.friendRequest.findMany({
    where: { fromUserId: session.userId, status: "PENDING" },
    select: { toUserId: true },
  });
  const pendingToMe = await prisma.friendRequest.findMany({
    where: { toUserId: session.userId, status: "PENDING" },
    select: { fromUserId: true },
  });
  const excludeIds = new Set([
    ...Array.from(friendIds),
    ...pendingFromMe.map((r) => r.toUserId),
    ...pendingToMe.map((r) => r.fromUserId),
  ]);
  const users = await prisma.user.findMany({
    where: { id: { notIn: Array.from(excludeIds) } },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return users;
}

/** Pending requests sent by current user (for "Sent" section). */
export async function getSentFriendRequests() {
  const session = await getSession();
  if (!session) return [];
  const list = await prisma.friendRequest.findMany({
    where: { fromUserId: session.userId, status: "PENDING" },
    include: { toUser: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return list.map((r) => ({ id: r.id, user: r.toUser }));
}

/** Pending requests received by current user (incoming). */
export async function getIncomingFriendRequests() {
  const session = await getSession();
  if (!session) return [];
  const list = await prisma.friendRequest.findMany({
    where: { toUserId: session.userId, status: "PENDING" },
    include: { fromUser: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return list.map((r) => ({ id: r.id, user: r.fromUser }));
}

/** Send a friend request (instead of adding immediately). */
export async function sendFriendRequest(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const toUserId = (formData.get("userId") ?? "").toString();
  if (!toUserId) return { error: "Missing user" };
  if (toUserId === session.userId) return { error: "Cannot add yourself" };
  const [userAId, userBId] = orderedPair(session.userId, toUserId);
  const existingFriendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (existingFriendship) return { error: "Already friends" };
  const existingRequest = await prisma.friendRequest.findUnique({
    where: { fromUserId_toUserId: { fromUserId: session.userId, toUserId } },
  });
  if (existingRequest) {
    if (existingRequest.status === "PENDING") return { error: "Request already sent" };
  }
  const reverseRequest = await prisma.friendRequest.findUnique({
    where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: session.userId } },
  });
  if (reverseRequest?.status === "PENDING") {
    return { error: "They already sent you a request — accept it above" };
  }
  const req = await prisma.friendRequest.upsert({
    where: { fromUserId_toUserId: { fromUserId: session.userId, toUserId } },
    create: { fromUserId: session.userId, toUserId, status: "PENDING" },
    update: { status: "PENDING" },
  });
  await createNotification(toUserId, "FRIEND_REQUEST", {
    actorId: session.userId,
    meta: { friendRequestId: req.id },
  });
  revalidatePath("/friends");
  return { success: true };
}

/** Accept an incoming friend request. */
export async function acceptFriendRequest(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const requestId = (formData.get("requestId") ?? "").toString();
  if (!requestId) return { error: "Missing request" };
  const req = await prisma.friendRequest.findUnique({
    where: { id: requestId, toUserId: session.userId, status: "PENDING" },
  });
  if (!req) return { error: "Request not found or already handled" };
  const [userAId, userBId] = orderedPair(req.fromUserId, req.toUserId);
  await prisma.$transaction([
    prisma.friendship.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: {},
    }),
    prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
    }),
  ]);
  revalidatePath("/friends");
  return { success: true };
}

/** Decline an incoming friend request. */
export async function declineFriendRequest(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const requestId = (formData.get("requestId") ?? "").toString();
  if (!requestId) return { error: "Missing request" };
  await prisma.friendRequest.updateMany({
    where: { id: requestId, toUserId: session.userId, status: "PENDING" },
    data: { status: "DECLINED" },
  });
  revalidatePath("/friends");
  return { success: true };
}

/** Cancel a sent friend request. */
export async function cancelFriendRequest(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const requestId = (formData.get("requestId") ?? "").toString();
  if (!requestId) return;
  await prisma.friendRequest.deleteMany({
    where: { id: requestId, fromUserId: session.userId, status: "PENDING" },
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
