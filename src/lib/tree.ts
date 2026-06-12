import { prisma } from "@/lib/db";

/** Ancestors are shown up to this many generations above the focus person. */
export const MAX_ANCESTOR_LEVELS = 6;

export type AncestorNode = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  /** Parents one generation up (father/mother, or however many are recorded). */
  parents: AncestorNode[];
  /** Spouse of the focus person (only populated on the focus node). */
  spouse: AncestorNode | null;
  /** Siblings of the focus person (only populated on the focus node). */
  siblings: AncestorNode[];
  /** True when the level cap was reached and this node still has parents to load. */
  hasMoreAncestors: boolean;
};

type Plain = { id: string; firstName: string; middleName: string | null; lastName: string };

/**
 * Build an upward (ancestor) tree rooted at the focus person. The focus node sits at the
 * bottom; parents recurse upward up to `maxLevels` generations. Spouse and siblings are
 * attached to the focus node only. Cycle-safe via a visited set; when the level cap is hit
 * and a node still has parents, `hasMoreAncestors` is set so the UI can offer to load more.
 */
export async function buildAncestorTree(
  personId: string,
  maxLevels = MAX_ANCESTOR_LEVELS
): Promise<AncestorNode | null> {
  const visited = new Set<string>();

  const loadParents = async (id: string): Promise<Plain[]> => {
    const rels = await prisma.relationship.findMany({
      where: { toPersonId: id, type: "PARENT" },
      select: {
        fromPerson: { select: { id: true, firstName: true, middleName: true, lastName: true } },
      },
    });
    return rels.map((r) => ({
      id: r.fromPerson.id,
      firstName: r.fromPerson.firstName,
      middleName: r.fromPerson.middleName ?? null,
      lastName: r.fromPerson.lastName,
    }));
  };

  const buildUp = async (p: Plain, level: number): Promise<AncestorNode> => {
    visited.add(p.id);
    const parentRecords = await loadParents(p.id);
    const unseen = parentRecords.filter((pr) => !visited.has(pr.id));

    let parents: AncestorNode[] = [];
    let hasMoreAncestors = false;
    if (level >= maxLevels) {
      hasMoreAncestors = unseen.length > 0;
    } else {
      parents = await Promise.all(unseen.map((pr) => buildUp(pr, level + 1)));
    }

    return {
      id: p.id,
      firstName: p.firstName,
      middleName: p.middleName,
      lastName: p.lastName,
      parents,
      spouse: null,
      siblings: [],
      hasMoreAncestors,
    };
  };

  const focus = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      relationshipsFrom: { include: { toPerson: true } },
      relationshipsTo: { include: { fromPerson: true } },
    },
  });
  if (!focus) return null;

  const spouseFromTo = focus.relationshipsTo.find((r) => r.type === "SPOUSE");
  const spouseFromFrom = focus.relationshipsFrom.find((r) => r.type === "SPOUSE");
  const spousePerson = spouseFromTo
    ? spouseFromTo.fromPerson
    : spouseFromFrom
      ? spouseFromFrom.toPerson
      : null;

  const siblingPeople = focus.relationshipsTo
    .filter((r) => r.type === "SIBLING")
    .map((r) => r.fromPerson);

  const node = await buildUp(
    {
      id: focus.id,
      firstName: focus.firstName,
      middleName: focus.middleName ?? null,
      lastName: focus.lastName,
    },
    0
  );

  const toLeaf = (p: Plain): AncestorNode => ({
    id: p.id,
    firstName: p.firstName,
    middleName: p.middleName,
    lastName: p.lastName,
    parents: [],
    spouse: null,
    siblings: [],
    hasMoreAncestors: false,
  });

  node.spouse = spousePerson
    ? toLeaf({
        id: spousePerson.id,
        firstName: spousePerson.firstName,
        middleName: spousePerson.middleName ?? null,
        lastName: spousePerson.lastName,
      })
    : null;
  node.siblings = siblingPeople.map((s) =>
    toLeaf({
      id: s.id,
      firstName: s.firstName,
      middleName: s.middleName ?? null,
      lastName: s.lastName,
    })
  );

  return node;
}
