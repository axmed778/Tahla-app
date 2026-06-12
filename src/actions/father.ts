"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { findFatherCandidates, type FatherCandidate } from "@/lib/father-match";
import { latinNameMatches } from "@/lib/translit";
import { surnamesMatch } from "@/lib/patronymic";
import { createNotification } from "@/actions/notifications";

export type FatherCandidateDTO = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  surnameMatches: boolean;
};

/**
 * Find potential fathers for a person within their clan. A candidate is a male in the
 * same clan whose given name matches the person's patronymic (middleName). Runs entirely
 * on the server. Returns an empty list when there is no patronymic, no clan, or no match.
 */
export async function getFatherCandidates(personId: string): Promise<FatherCandidateDTO[]> {
  const session = await getSession();
  if (!session) return [];

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      userId: true,
      user: { select: { clanId: true } },
    },
  });
  if (!person) return [];

  // Only the profile owner or the master may run detection for this person.
  const isOwner = person.userId === session.userId;
  if (!isOwner && !session.isMaster) return [];

  const patronymic = person.middleName?.trim();
  const clanId = person.user?.clanId;
  if (!patronymic || !clanId) return [];

  // Clan members are the Persons linked to users in the same clan.
  const clanPeople = await prisma.person.findMany({
    where: { user: { clanId }, gender: "MALE" },
    select: { id: true, firstName: true, lastName: true, middleName: true, gender: true },
  });

  const candidates: FatherCandidate[] = findFatherCandidates(
    { id: person.id, surname: person.lastName, patronymic },
    clanPeople
  );

  return candidates.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    middleName: c.middleName ?? null,
    lastName: c.lastName,
    surnameMatches: c.surnameMatches,
  }));
}

/**
 * Manual parent search for account creation: the user types the father's given name in
 * Latin and we search the clan for a matching male. Names stored in Cyrillic or with
 * Azerbaijani diacritics are folded to a common Latin key before comparing, so a Latin
 * query still finds them. Returns an empty list for short queries, no clan, or no match.
 */
export async function searchClanFathersByName(query: string): Promise<FatherCandidateDTO[]> {
  const session = await getSession();
  if (!session) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  const me = await prisma.person.findUnique({
    where: { userId: session.userId },
    select: { id: true, lastName: true, user: { select: { clanId: true } } },
  });
  if (!me) return [];
  const clanId = me.user?.clanId;
  if (!clanId) return [];

  const clanPeople = await prisma.person.findMany({
    where: { user: { clanId }, gender: "MALE" },
    select: { id: true, firstName: true, lastName: true, middleName: true },
  });

  const matches = clanPeople
    .filter((p) => p.id !== me.id && latinNameMatches(q, p.firstName))
    .map((p) => ({
      id: p.id,
      firstName: p.firstName,
      middleName: p.middleName ?? null,
      lastName: p.lastName,
      surnameMatches: surnamesMatch(p.lastName, me.lastName),
    }));

  // Surname agreement ranks higher, same as automatic detection.
  return matches.sort((a, b) => Number(b.surnameMatches) - Number(a.surnameMatches));
}

/**
 * Persist a confirmed father → child link as a parent-child edge (both directions),
 * mirroring the upsert pattern used in `addRelationship`. Validates that the caller owns
 * the child profile (or is master) and that both persons share a clan.
 */
export async function confirmFather(
  childPersonId: string,
  fatherPersonId: string
): Promise<{ success: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  if (childPersonId === fatherPersonId) return { error: "A person cannot be their own father." };

  const [child, father] = await Promise.all([
    prisma.person.findUnique({
      where: { id: childPersonId },
      select: { id: true, userId: true, user: { select: { clanId: true } } },
    }),
    prisma.person.findUnique({
      where: { id: fatherPersonId },
      select: { id: true, userId: true, user: { select: { clanId: true } } },
    }),
  ]);
  if (!child || !father) return { error: "Person not found." };

  const isOwner = child.userId === session.userId;
  if (!isOwner && !session.isMaster) return { error: "Not allowed to edit this profile." };

  const childClan = child.user?.clanId ?? null;
  const fatherClan = father.user?.clanId ?? null;
  if (childClan && fatherClan && childClan !== fatherClan) {
    return { error: "The selected father is in a different clan." };
  }

  // father is PARENT of child; store the same pair with both PARENT and CHILD types
  // so the tree reads parents (relationshipsTo PARENT) and children (relationshipsFrom CHILD).
  const upsertEdge = async (type: "PARENT" | "CHILD") => {
    await prisma.relationship.upsert({
      where: {
        fromPersonId_toPersonId_type: {
          fromPersonId: fatherPersonId,
          toPersonId: childPersonId,
          type,
        },
      },
      create: { fromPersonId: fatherPersonId, toPersonId: childPersonId, type },
      update: {},
    });
  };
  await upsertEdge("PARENT");
  await upsertEdge("CHILD");

  if (father.userId && father.userId !== session.userId) {
    await createNotification(father.userId, "ADDED_AS_RELATIVE", {
      actorId: session.userId,
      meta: { personId: childPersonId },
    });
  }

  revalidatePath(`/people/${childPersonId}`);
  revalidatePath(`/people/${fatherPersonId}`);
  return { success: true };
}
