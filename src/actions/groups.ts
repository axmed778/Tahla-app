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
  const isPrivate = formData.get("isPrivate") === "true" || formData.get("isPrivate") === "on";
  if (!name) return { error: "Group name is required" };
  const group = await prisma.group.create({
    data: {
      name,
      description,
      isPrivate,
      createdById: session.userId,
    },
  });
  await prisma.groupMember.create({
    data: { groupId: group.id, userId: session.userId, role: "ADMIN" },
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
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return { error: "Group not found" };
  if (group.isPrivate) return { error: "This group is private; use Apply to join" };
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId, userId: session.userId } },
    create: { groupId, userId: session.userId, role: "MEMBER" },
    update: {},
  });
  revalidatePath("/groups");
  revalidatePath("/feed");
  revalidatePath(`/groups/${groupId}`);
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
  revalidatePath(`/groups/${groupId}`);
  redirect("/groups");
}

export async function getGroup(id: string) {
  const session = await getSession();
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      applications: {
        where: { status: "PENDING" },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      },
    },
  });
  if (!group) return null;
  if (!session) return null;
  const isMember = group.members.some((m) => m.userId === session.userId);
  if (!isMember) return null;
  return group;
}

export async function getCurrentUserRoleInGroup(groupId: string): Promise<"ADMIN" | "MEMBER" | null> {
  const session = await getSession();
  if (!session) return null;
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.userId } },
    select: { role: true },
  });
  return member?.role === "ADMIN" ? "ADMIN" : member ? "MEMBER" : null;
}

export async function setGroupVisibility(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const groupId = (formData.get("groupId") as string)?.trim();
  const isPrivate = formData.get("isPrivate") === "true";
  if (!groupId) return { error: "Missing group" };
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.userId } },
  });
  if (!member || member.role !== "ADMIN") return { error: "Only group admins can change visibility" };
  await prisma.group.update({
    where: { id: groupId },
    data: { isPrivate },
  });
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function applyToJoinGroup(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const groupId = (formData.get("groupId") as string)?.trim();
  if (!groupId) return { error: "Missing group" };
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return { error: "Group not found" };
  if (!group.isPrivate) {
    return joinGroup(formData);
  }
  const existing = await prisma.groupApplication.findUnique({
    where: { groupId_userId: { groupId, userId: session.userId } },
  });
  if (existing) return { error: existing.status === "PENDING" ? "Application already sent" : "Already applied" };
  const alreadyMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.userId } },
  });
  if (alreadyMember) return { error: "Already a member" };
  await prisma.groupApplication.create({
    data: { groupId, userId: session.userId, status: "PENDING" },
  });
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function approveOrRejectApplication(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const groupId = (formData.get("groupId") as string)?.trim();
  const userId = (formData.get("userId") as string)?.trim();
  const action = (formData.get("action") as string)?.trim(); // "approve" | "reject"
  if (!groupId || !userId || !action) return { error: "Missing data" };
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.userId } },
  });
  if (!member || member.role !== "ADMIN") return { error: "Only group admins can manage applications" };
  const application = await prisma.groupApplication.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!application || application.status !== "PENDING") return { error: "Application not found or already processed" };
  if (action === "approve") {
    await prisma.groupApplication.update({
      where: { id: application.id },
      data: { status: "APPROVED" },
    });
    await prisma.groupMember.create({
      data: { groupId, userId, role: "MEMBER" },
    });
  } else {
    await prisma.groupApplication.update({
      where: { id: application.id },
      data: { status: "REJECTED" },
    });
  }
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return { success: true };
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
    where: { isPrivate: false },
    include: { _count: { select: { members: true } } },
  });
  return groups.filter((g) => !joinedIds.has(g.id));
}
