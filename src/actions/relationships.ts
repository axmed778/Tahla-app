"use server";

import { prisma } from "@/lib/db";
import { relationshipSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
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

  if (type === "SIBLING" || type === "SPOUSE" || type === "OTHER") {
    await createPair(fromPersonId, toPersonId, type, label ?? null);
    await createPair(toPersonId, fromPersonId, inverse, label ?? null);
  } else {
    await createPair(fromPersonId, toPersonId, type, label ?? null);
    await createPair(toPersonId, fromPersonId, inverse, label ?? null);
  }

  revalidatePath(`/people/${fromPersonId}`);
  revalidatePath(`/people/${toPersonId}`);
  return { success: true };
}

export async function removeRelationship(fromPersonId: string, toPersonId: string, type: RelationshipType) {
  const inverse = INVERSES[type];
  await prisma.relationship.deleteMany({
    where: {
      OR: [
        { fromPersonId, toPersonId, type },
        { fromPersonId: toPersonId, toPersonId: fromPersonId, type: inverse },
      ],
    },
  });
  revalidatePath(`/people/${fromPersonId}`);
  revalidatePath(`/people/${toPersonId}`);
  return { success: true };
}
