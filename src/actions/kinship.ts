"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  buildKinshipGraph,
  dijkstra,
  describeRelation,
  type FamilyEdge,
} from "@/lib/kinship";
import { formatPersonName } from "@/lib/utils";
import { getLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n-config";

export type KinshipPersonDTO = { id: string; name: string };

export type KinshipPathDTO = {
  label: string;
  weight: number;
  commonAncestor: KinshipPersonDTO | null;
  /** Ordered chain of people from the focus person to the target. */
  chain: KinshipPersonDTO[];
};

type PlainPerson = { id: string; firstName: string; middleName: string | null; lastName: string; gender: string };

function nameOf(p: PlainPerson, locale: Locale): string {
  return formatPersonName(p, locale);
}

/**
 * List people the viewer may pick as the second endpoint of a kinship search. Scoped to
 * the focus person's clan (or all people when the person has no clan), excluding the focus.
 */
export async function peopleForKinshipPicker(personId: string): Promise<KinshipPersonDTO[]> {
  const session = await getSession();
  if (!session) return [];

  const focus = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true, user: { select: { clanId: true } } },
  });
  if (!focus) return [];

  const clanId = focus.user?.clanId ?? null;
  const people = await prisma.person.findMany({
    where: {
      id: { not: personId },
      ...(clanId ? { user: { clanId } } : {}),
    },
    select: { id: true, firstName: true, middleName: true, lastName: true, gender: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const locale = await getLocale();
  return people.map((p) => ({ id: p.id, name: nameOf(p, locale) }));
}

/**
 * Find the shortest relationship path between two people using the PARENT/SPOUSE graph,
 * scoped to the focus person's clan. Returns a human-readable label, total weight, the
 * common ancestor (for blood lineages), and the chain of people along the path.
 */
export async function findKinshipPath(
  fromId: string,
  toId: string
): Promise<{ path: KinshipPathDTO } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  if (fromId === toId) return { error: "Pick two different people." };

  const focus = await prisma.person.findUnique({
    where: { id: fromId },
    select: { id: true, user: { select: { clanId: true } } },
  });
  if (!focus) return { error: "Person not found." };
  const clanId = focus.user?.clanId ?? null;

  // Load PARENT and SPOUSE relationships among people in the same clan (or all when none).
  const personFilter = clanId ? { user: { clanId } } : {};
  const rels = await prisma.relationship.findMany({
    where: {
      type: { in: ["PARENT", "SPOUSE"] },
      fromPerson: personFilter,
      toPerson: personFilter,
    },
    select: { fromPersonId: true, toPersonId: true, type: true },
  });

  const edges: FamilyEdge[] = rels.map((r) => ({
    from: r.fromPersonId,
    to: r.toPersonId,
    type: r.type === "PARENT" ? "PARENT" : "SPOUSE",
  }));

  const graph = buildKinshipGraph(edges);
  const path = dijkstra(graph, fromId, toId);
  if (!path) return { error: "No relationship path found between these people." };

  const desc = describeRelation(path);

  const people = await prisma.person.findMany({
    where: { id: { in: path.nodes } },
    select: { id: true, firstName: true, middleName: true, lastName: true, gender: true },
  });
  const locale = await getLocale();
  const nameById = new Map(people.map((p) => [p.id, nameOf(p, locale)]));

  const chain: KinshipPersonDTO[] = path.nodes.map((id) => ({
    id,
    name: nameById.get(id) ?? id,
  }));
  const commonAncestor = desc.commonAncestorId
    ? { id: desc.commonAncestorId, name: nameById.get(desc.commonAncestorId) ?? desc.commonAncestorId }
    : null;

  return {
    path: { label: desc.label, weight: desc.weight, commonAncestor, chain },
  };
}
