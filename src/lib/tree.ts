import { prisma } from "@/lib/db";

/** 3 generations: root, parents/children/spouse, then their parents/children (depth 0, 1, 2) */
const MAX_DEPTH = 2;

type PersonNode = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  parents: PersonNode[];
  spouse: PersonNode | null;
  children: PersonNode[];
  siblings: PersonNode[];
};

export async function buildTree(personId: string, depth = 0): Promise<PersonNode | null> {
  if (depth > MAX_DEPTH) return null;
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      relationshipsFrom: { include: { toPerson: true } },
      relationshipsTo: { include: { fromPerson: true } },
    },
  });
  if (!person) return null;

  const parents = person.relationshipsTo
    .filter((r) => r.type === "PARENT")
    .map((r) => r.fromPerson);
  const children = person.relationshipsFrom
    .filter((r) => r.type === "CHILD")
    .map((r) => r.toPerson);
  const spouseRel = person.relationshipsTo.find((r) => r.type === "SPOUSE")
    ?? person.relationshipsFrom.find((r) => r.type === "SPOUSE");
  const spouse = spouseRel
    ? (person.relationshipsTo.some((r) => r.type === "SPOUSE") ? spouseRel.fromPerson : spouseRel.toPerson)
    : null;
  const siblings = person.relationshipsTo
    .filter((r) => r.type === "SIBLING")
    .map((r) => r.fromPerson);

  const node: PersonNode = {
    id: person.id,
    firstName: person.firstName,
    middleName: person.middleName ?? null,
    lastName: person.lastName,
    parents: [],
    spouse: null,
    children: [],
    siblings: [],
  };

  const seen = new Set<string>([personId]);
  const loadChild = async (p: { id: string }) => {
    if (seen.has(p.id)) return null;
    seen.add(p.id);
    return buildTree(p.id, depth + 1);
  };

  const [parentNodes, spouseNode, childNodes, siblingNodes] = await Promise.all([
    Promise.all(parents.map((p) => loadChild(p))),
    spouse ? loadChild(spouse) : Promise.resolve(null),
    Promise.all(children.map((p) => loadChild(p))),
    Promise.all(siblings.map((p) => loadChild(p))),
  ]);

  node.parents = parentNodes.filter((n): n is PersonNode => n != null);
  node.spouse = spouseNode ?? null;
  node.children = childNodes.filter((n): n is PersonNode => n != null);
  node.siblings = siblingNodes.filter((n): n is PersonNode => n != null);

  return node;
}
