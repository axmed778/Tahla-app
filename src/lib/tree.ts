import { prisma } from "@/lib/db";

/** Ancestors are shown up to this many generations above the focus person. */
export const MAX_ANCESTOR_LEVELS = 6;

/** Descendants of the apical ancestor are expanded up to this many generations. */
export const MAX_DESCENDANT_LEVELS = 12;

export type FamilyTreeNode = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: string;
  /** True for the person the tree was opened for (highlighted in the UI). */
  isFocus: boolean;
  /** Children one generation down. */
  children: FamilyTreeNode[];
  /** True when the level cap was hit and this node still has children to load. */
  hasMoreDescendants: boolean;
};

export type FamilyTree = {
  /** Root of the tree: the apical (topmost) ancestor reachable from the focus. */
  apex: FamilyTreeNode;
  /** The person the tree was opened for. */
  focus: { id: string; firstName: string; middleName: string | null; lastName: string; gender: string };
};

/**
 * Build the full family tree around `focusId`: walk up the parent chain to the apical
 * ancestor, then expand that ancestor's complete descendant tree downward. This surfaces
 * not just the focus's direct line and siblings but also collateral branches — e.g. a
 * grandfather's brother and their descendants (cousins). Cycle-safe via a visited set;
 * when the descendant cap is hit, `hasMoreDescendants` is set so the UI can indicate it.
 */
export async function buildFamilyTree(
  focusId: string,
  maxUp = MAX_ANCESTOR_LEVELS,
  maxDown = MAX_DESCENDANT_LEVELS
): Promise<FamilyTree | null> {
  const focus = await prisma.person.findUnique({
    where: { id: focusId },
    select: { id: true, firstName: true, middleName: true, lastName: true, gender: true },
  });
  if (!focus) return null;

  // Walk up the parent chain (primary/oldest parent at each step) to the apical ancestor.
  const seenUp = new Set<string>([focus.id]);
  let apex: Plain = {
    id: focus.id,
    firstName: focus.firstName,
    middleName: focus.middleName ?? null,
    lastName: focus.lastName,
    gender: focus.gender,
  };
  for (let i = 0; i < maxUp; i++) {
    const rel = await prisma.relationship.findFirst({
      where: { toPersonId: apex.id, type: "PARENT" },
      select: {
        fromPerson: { select: { id: true, firstName: true, middleName: true, lastName: true, gender: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    if (!rel || seenUp.has(rel.fromPerson.id)) break;
    seenUp.add(rel.fromPerson.id);
    apex = {
      id: rel.fromPerson.id,
      firstName: rel.fromPerson.firstName,
      middleName: rel.fromPerson.middleName ?? null,
      lastName: rel.fromPerson.lastName,
      gender: rel.fromPerson.gender,
    };
  }

  // Expand the apex's full descendant tree downward.
  const visited = new Set<string>();
  const buildDown = async (person: Plain, level: number): Promise<FamilyTreeNode> => {
    visited.add(person.id);
    const childRels = await prisma.relationship.findMany({
      where: { fromPersonId: person.id, type: "CHILD" },
      select: {
        toPerson: { select: { id: true, firstName: true, middleName: true, lastName: true, gender: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    const kids: Plain[] = childRels
      .map((r) => ({
        id: r.toPerson.id,
        firstName: r.toPerson.firstName,
        middleName: r.toPerson.middleName ?? null,
        lastName: r.toPerson.lastName,
        gender: r.toPerson.gender,
      }))
      .filter((c) => !visited.has(c.id));

    let children: FamilyTreeNode[] = [];
    let hasMoreDescendants = false;
    if (level >= maxDown) {
      hasMoreDescendants = kids.length > 0;
    } else {
      for (const c of kids) children.push(await buildDown(c, level + 1));
    }

    return {
      id: person.id,
      firstName: person.firstName,
      middleName: person.middleName,
      lastName: person.lastName,
      gender: person.gender,
      isFocus: person.id === focus.id,
      children,
      hasMoreDescendants,
    };
  };

  const apexNode = await buildDown(apex, 0);
  return {
    apex: apexNode,
    focus: {
      id: focus.id,
      firstName: focus.firstName,
      middleName: focus.middleName ?? null,
      lastName: focus.lastName,
      gender: focus.gender,
    },
  };
}

type Plain = { id: string; firstName: string; middleName: string | null; lastName: string; gender: string };
