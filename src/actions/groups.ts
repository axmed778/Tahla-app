"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getGroupsForUser() {
  const session = await getSession();
  if (!session) return [];
  const members = await prisma.groupMember.findMany({
    where: { userId: session.userId },
    include: {
      group: {
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { members: true } },
        },
      },
    },
  });
  return members.map((m) => m.group);
}

export async function createGroup(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  if (!name) return { error: "Group name is required" };
  const group = await prisma.group.create({
    data: {
      name,
      description,
      createdById: session.userId,
    },
  });
  await prisma.groupMember.create({
    data: { groupId: group.id, userId: session.userId },
  });
  revalidatePath("/groups");
  revalidatePath("/feed");
  redirect("/groups");
}

export async function joinGroup(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const groupId = (formData.get("groupId") as string)?.trim();
  if (!groupId) return { error: "Missing group" };
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId, userId: session.userId } },
    create: { groupId, userId: session.userId },
    update: {},
  });
  revalidatePath("/groups");
  revalidatePath("/feed");
  return { success: true };
}

export async function leaveGroup(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const groupId = (formData.get("groupId") as string)?.trim();
  if (!groupId) return { error: "Missing group" };
  await prisma.groupMember.deleteMany({
    where: { groupId, userId: session.userId },
  });
  revalidatePath("/groups");
  revalidatePath("/feed");
  return { success: true };
}

export async function getGroup(id: string) {
  return prisma.group.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });
}

export async function getAvailableGroups() {
  const session = await getSession();
  if (!session) return [];
  const joined = await prisma.groupMember.findMany({
    where: { userId: session.userId },
    select: { groupId: true },
  });
  const joinedIds = new Set(joined.map((j) => j.groupId));
  const groups = await prisma.group.findMany({
    include: { _count: { select: { members: true } } },
  });
  return groups.filter((g) => !joinedIds.has(g.id));
}
