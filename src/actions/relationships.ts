"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { relationshipSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/actions/notifications";
type RelationshipType = "PARENT" | "CHILD" | "SIBLING" | "SPOUSE" | "OTHER";

const INVERSES: Record<RelationshipType, RelationshipType> = {
  PARENT: "CHILD",
  CHILD: "PARENT",
  SIBLING: "SIBLING",
  SPOUSE: "SPOUSE",
  OTHER: "OTHER",
};

function normalizePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function addRelationship(fromPersonId: string, data: { toPersonId: string; type: RelationshipType; label?: string }) {
  const session = await getSession();
  const parsed = relationshipSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[] | undefined> };
  }
  const { toPersonId, type, label } = parsed.data;
  if (fromPersonId === toPersonId) return { error: { toPersonId: ["Cannot relate person to themselves"] } };

  const inverse = INVERSES[type];
  const createPair = async (from: string, to: string, t: RelationshipType, l: string | null) => {
    await prisma.relationship.upsert({
      where: {
        fromPersonId_toPersonId_type: { fromPersonId: from, toPersonId: to, type: t },
      },
      create: { fromPersonId: from, toPersonId: to, type: t, label: l },
      update: {},
    });
  };

  // PARENT/CHILD: one direction only for the inverse (same pair, inverse type).
  // (A parent of B) → (A,B,PARENT) + (A,B,CHILD) so B sees parent A and A sees child B.
  if (type === "PARENT" || type === "CHILD") {
    await createPair(fromPersonId, toPersonId, type, label ?? null);
    await createPair(fromPersonId, toPersonId, inverse, label ?? null);
  } else {
    // SIBLING / SPOUSE / OTHER: symmetric, so swap from↔to and create inverse.
    await createPair(fromPersonId, toPersonId, type, label ?? null);
    await createPair(toPersonId, fromPersonId, inverse, label ?? null);
  }

  if (session) {
    const toPerson = await prisma.person.findUnique({
      where: { id: toPersonId },
      select: { userId: true },
    });
    if (toPerson?.userId && toPerson.userId !== session.userId) {
      await createNotification(toPerson.userId, "ADDED_AS_RELATIVE", {
        actorId: session.userId,
        meta: { personId: toPersonId },
      });
    }
  }

  revalidatePath(`/people/${fromPersonId}`);
  revalidatePath(`/people/${toPersonId}`);
  return { success: true };
}

export async function removeRelationship(fromPersonId: string, toPersonId: string, type: RelationshipType) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const [fromPerson, toPerson] = await Promise.all([
    prisma.person.findUnique({ where: { id: fromPersonId }, select: { userId: true } }),
    prisma.person.findUnique({ where: { id: toPersonId }, select: { userId: true } }),
  ]);
  if (!fromPerson || !toPerson) return { error: "Person not found" };
  const canEditFrom = fromPerson.userId === session.userId;
  const canEditTo = toPerson.userId === session.userId;
  if (!session.isMaster && !canEditFrom && !canEditTo) return { error: "You can only remove relationships for your own profile" };

  const inverse = INVERSES[type];
  if (type === "PARENT" || type === "CHILD") {
    // Same pair, two types
    await prisma.relationship.deleteMany({
      where: {
        fromPersonId,
        toPersonId,
        type: { in: [type, inverse] },
      },
    });
  } else {
    await prisma.relationship.deleteMany({
      where: {
        OR: [
          { fromPersonId, toPersonId, type },
          { fromPersonId: toPersonId, toPersonId: fromPersonId, type: inverse },
        ],
      },
    });
  }
  revalidatePath(`/people/${fromPersonId}`);
  revalidatePath(`/people/${toPersonId}`);
  return { success: true };
}
