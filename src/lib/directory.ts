import { prisma } from "@/lib/db";

const PAGE_SIZE = 20;

export type SortOption = "updatedAt" | "name";

export async function getDirectoryPeople(params: {
  q?: string;
  city?: string;
  maritalStatus?: string;
  gender?: string;
  sort?: SortOption;
  page?: number;
}) {
  const { q, city, maritalStatus, gender, sort = "updatedAt", page = 1 } = params;
  const skip = (page - 1) * PAGE_SIZE;

  const where: Parameters<typeof prisma.person.findMany>[0]["where"] = {};

  if (q?.trim()) {
    const term = q.trim();
    where.OR = [
      { firstName: { contains: term } },
      { middleName: { contains: term } },
      { lastName: { contains: term } },
      { city: { contains: term } },
      { workplace: { contains: term } },
      { notes: { contains: term } },
      { phones: { some: { number: { contains: term } } } },
      { emails: { some: { email: { contains: term } } } },
      { tags: { some: { tag: { name: { contains: term } } } } },
    ];
  }
  if (city) where.city = city;
  if (maritalStatus) where.maritalStatus = maritalStatus as "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | "OTHER";
  if (gender) where.gender = gender as "MALE" | "FEMALE" | "OTHER";

  const orderBy =
    sort === "name"
      ? [{ lastName: "asc" as const }, { firstName: "asc" as const }]
      : { updatedAt: "desc" as const };

  const [people, total] = await Promise.all([
    prisma.person.findMany({
      where,
      include: { phones: true, tags: { include: { tag: true } } },
      orderBy,
      skip,
      take: PAGE_SIZE,
    }),
    prisma.person.count({ where }),
  ]);

  const cities = await prisma.person.findMany({
    where: { city: { not: null } },
    select: { city: true },
    distinct: ["city"],
  }).then((r) => r.map((x) => x.city).filter(Boolean) as string[]);

  return { people, total, totalPages: Math.ceil(total / PAGE_SIZE), cities, page };
}
