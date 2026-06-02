"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/actions/notifications";
import { addRelationshipFromRequest } from "@/actions/relationships";

export type RelationshipRequestType = "PARENT" | "CHILD" | "SIBLING" | "SPOUSE" | "PARTNER" | "OTHER";

function normalizeRequestType(v: unknown): RelationshipRequestType {
  return v === "PARENT" || v === "CHILD" || v === "SIBLING" || v === "SPOUSE" || v === "PARTNER" || v === "OTHER"
    ? v
    : "OTHER";
}

export async function createRelationshipRequest(options: {
  toUserId: string;
  type: RelationshipRequestType;
  label?: string;
}) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  if (options.toUserId === session.userId) return { error: "Cannot request yourself" };

  const type = normalizeRequestType(options.type);
  const label = (options.label ?? "").trim() || null;

  const [fromUser, toUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { person: { select: { id: true } } } }),
    prisma.user.findUnique({ where: { id: options.toUserId }, select: { person: { select: { id: true } } } }),
  ]);
  if (!fromUser?.person?.id) return { error: "Complete your profile first." };
  if (!toUser?.person?.id) return { error: "This user has no profile yet." };

  // Block duplicates: pending in either direction.
  const existingPending = await prisma.relationshipRequest.findFirst({
    where: {
      status: "PENDING",
      OR: [
        { fromUserId: session.userId, toUserId: options.toUserId },
        { fromUserId: options.toUserId, toUserId: session.userId },
      ],
    },
    select: { id: true },
  });
  if (existingPending) return { error: "A pending request already exists." };

  const req = await prisma.relationshipRequest.create({
    data: {
      fromUserId: session.userId,
      toUserId: options.toUserId,
      type,
      label,
      status: "PENDING",
    },
    select: { id: true },
  });

  await createNotification(options.toUserId, "RELATIVE_REQUEST", {
    actorId: session.userId,
    meta: { relationshipRequestId: req.id },
  });

  revalidatePath("/notifications");
  return { success: true as const, id: req.id };
}

export async function listPendingRelationshipRequests() {
  const session = await getSession();
  if (!session) return [];
  const list = await prisma.relationshipRequest.findMany({
    where: { toUserId: session.userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      fromUser: { select: { firstName: true, lastName: true, person: { select: { id: true } } } },
    },
  });
  return list.map((r) => ({
    id: r.id,
    fromUserId: r.fromUserId,
    fromName: `${r.fromUser.firstName} ${r.fromUser.lastName}`,
    fromPersonId: r.fromUser.person?.id ?? null,
    type: normalizeRequestType(r.type),
    label: r.label,
    createdAt: r.createdAt,
  }));
}

export async function respondToRelationshipRequest(requestId: string, action: "ACCEPT" | "DECLINE") {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };

  const req = await prisma.relationshipRequest.findUnique({
    where: { id: requestId },
    select: { id: true, fromUserId: true, toUserId: true, type: true, label: true, status: true },
  });
  if (!req || req.toUserId !== session.userId) return { error: "Request not found" };
  if (req.status !== "PENDING") return { error: "Request already handled" };

  if (action === "DECLINE") {
    await prisma.relationshipRequest.delete({ where: { id: requestId } });
    revalidatePath("/notifications");
    return { success: true as const };
  }

  // ACCEPT: create relationships between the two people.
  const [fromUser, toUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.fromUserId }, select: { person: { select: { id: true } } } }),
    prisma.user.findUnique({ where: { id: req.toUserId }, select: { person: { select: { id: true } } } }),
  ]);
  const fromPersonId = fromUser?.person?.id;
  const toPersonId = toUser?.person?.id;
  if (!fromPersonId || !toPersonId) return { error: "Both users must have profiles." };

  const t = normalizeRequestType(req.type);
  if (t === "PARENT") {
    // Target user (toUser) is parent of requester (fromUser)
    await addRelationshipFromRequest(toPersonId, { toPersonId: fromPersonId, type: "PARENT", label: req.label ?? undefined });
  } else if (t === "CHILD") {
    // Target user is child of requester
    await addRelationshipFromRequest(fromPersonId, { toPersonId: toPersonId, type: "CHILD", label: req.label ?? undefined });
  } else if (t === "SIBLING") {
    await addRelationshipFromRequest(fromPersonId, { toPersonId: toPersonId, type: "SIBLING", label: req.label ?? undefined });
  } else if (t === "SPOUSE") {
    await addRelationshipFromRequest(fromPersonId, { toPersonId: toPersonId, type: "SPOUSE", label: req.label ?? undefined });
  } else if (t === "PARTNER") {
    await addRelationshipFromRequest(fromPersonId, { toPersonId: toPersonId, type: "OTHER", label: req.label ?? "Partner" });
  } else {
    await addRelationshipFromRequest(fromPersonId, { toPersonId: toPersonId, type: "OTHER", label: req.label ?? undefined });
  }

  await prisma.relationshipRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED" } });
  revalidatePath("/notifications");
  return { success: true as const };
}

