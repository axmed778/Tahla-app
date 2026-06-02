"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { exportDataSchema, type ExportData } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { deleteStoredImage } from "@/lib/file-upload";

export async function getExportData(): Promise<ExportData> {
  const session = await getSession();
  if (!session) throw new Error("Not logged in");
  if (!session.isMaster) throw new Error("Only the app owner can export data.");

  const people = await prisma.person.findMany({
    include: {
      phones: true,
      emails: true,
      tags: { include: { tag: true } },
    },
  });
  const tags = await prisma.tag.findMany();
  const relationships = await prisma.relationship.findMany();

  const peopleExport = people.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    middleName: p.middleName,
    gender: p.gender,
    birthDate: p.birthDate?.toISOString() ?? null,
    deathDate: p.deathDate?.toISOString() ?? null,
    country: p.country,
    city: p.city,
    address: p.address,
    occupation: p.occupation,
    workplace: p.workplace,
    maritalStatus: p.maritalStatus,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    phones: p.phones.map((ph) => ({ id: ph.id, label: ph.label, number: ph.number })),
    emails: p.emails.map((e) => ({ id: e.id, label: e.label, email: e.email })),
    tags: p.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
  }));

  const tagsExport = tags.map((t) => ({ id: t.id, name: t.name }));
  const relationshipsExport = relationships.map((r) => ({
    id: r.id,
    fromPersonId: r.fromPersonId,
    toPersonId: r.toPersonId,
    type: r.type,
    label: r.label,
    createdAt: r.createdAt.toISOString(),
  }));

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    people: peopleExport,
    tags: tagsExport,
    relationships: relationshipsExport,
  } as ExportData;
}

export type ImportMode = "replace" | "merge";

export async function importData(json: string, mode: ImportMode): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session?.isMaster) return { error: "Only the app owner can import data." };

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { error: "Invalid JSON" };
  }
  const parsed = exportDataSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? "Validation failed" };
  }

  if (mode === "replace") {
    await prisma.relationship.deleteMany({});
    await prisma.personTag.deleteMany({});
    await prisma.personPhone.deleteMany({});
    await prisma.personEmail.deleteMany({});
    const photosToDelete = await prisma.person.findMany({
      where: { photoUrl: { not: null } },
      select: { photoUrl: true },
    });
    for (const row of photosToDelete) {
      await deleteStoredImage(row.photoUrl);
    }
    await prisma.person.deleteMany({});
    await prisma.tag.deleteMany({});
  }

  const tagIdMap = new Map<string, string>();
  for (const t of parsed.data.tags) {
    const existing = await prisma.tag.findUnique({ where: { id: t.id } });
    if (existing) {
      tagIdMap.set(t.id, existing.id);
    } else if (mode === "replace") {
      await prisma.tag.create({ data: { id: t.id, name: t.name } });
      tagIdMap.set(t.id, t.id);
    } else {
      const created = await prisma.tag.upsert({
        where: { name: t.name },
        create: { name: t.name },
        update: {},
      });
      tagIdMap.set(t.id, created.id);
    }
  }

  const personIdMap = new Map<string, string>();
  for (const p of parsed.data.people) {
    const existing = mode === "merge" ? await prisma.person.findUnique({ where: { id: p.id } }) : null;
    if (existing) {
      personIdMap.set(p.id, existing.id);
      await prisma.person.update({
        where: { id: existing.id },
        data: {
          firstName: p.firstName,
          lastName: p.lastName,
          middleName: p.middleName,
          gender: p.gender,
          birthDate: p.birthDate ? new Date(p.birthDate) : null,
          deathDate: p.deathDate ? new Date(p.deathDate) : null,
          country: p.country,
          city: p.city,
          address: p.address,
          occupation: p.occupation,
          workplace: p.workplace,
          maritalStatus: p.maritalStatus,
          notes: p.notes,
        },
      });
      await prisma.personPhone.deleteMany({ where: { personId: existing.id } });
      await prisma.personEmail.deleteMany({ where: { personId: existing.id } });
      await prisma.personTag.deleteMany({ where: { personId: existing.id } });
      const existingTagIds = p.tags.map((t) => tagIdMap.get(t.id)).filter((id): id is string => !!id);
      await Promise.all([
        p.phones.length > 0 && prisma.personPhone.createMany({
          data: p.phones.map((ph) => ({ personId: existing.id, label: ph.label, number: ph.number })),
        }),
        p.emails.length > 0 && prisma.personEmail.createMany({
          data: p.emails.map((e) => ({ personId: existing.id, label: e.label, email: e.email })),
        }),
        existingTagIds.length > 0 && prisma.personTag.createMany({
          data: existingTagIds.map((tagId) => ({ personId: existing.id, tagId })),
          skipDuplicates: true,
        }),
      ]);
      continue;
    } else {
      const created = await prisma.person.create({
        data: {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          middleName: p.middleName,
          gender: p.gender,
          birthDate: p.birthDate ? new Date(p.birthDate) : null,
          deathDate: p.deathDate ? new Date(p.deathDate) : null,
          country: p.country,
          city: p.city,
          address: p.address,
          occupation: p.occupation,
          workplace: p.workplace,
          maritalStatus: p.maritalStatus,
          notes: p.notes,
        },
      });
      personIdMap.set(p.id, created.id);
    }
    const targetId = personIdMap.get(p.id)!;
    const newTagIds = p.tags.map((t) => tagIdMap.get(t.id)).filter((id): id is string => !!id);
    await Promise.all([
      p.phones.length > 0 && prisma.personPhone.createMany({
        data: p.phones.map((ph) => ({ id: ph.id, personId: targetId, label: ph.label, number: ph.number })),
      }),
      p.emails.length > 0 && prisma.personEmail.createMany({
        data: p.emails.map((e) => ({ id: e.id, personId: targetId, label: e.label, email: e.email })),
      }),
      newTagIds.length > 0 && prisma.personTag.createMany({
        data: newTagIds.map((tagId) => ({ personId: targetId, tagId })),
        skipDuplicates: true,
      }),
    ]);
  }

  for (const r of parsed.data.relationships) {
    const fromId = personIdMap.get(r.fromPersonId);
    const toId = personIdMap.get(r.toPersonId);
    if (!fromId || !toId) continue;
    await prisma.relationship.upsert({
      where: {
        fromPersonId_toPersonId_type: { fromPersonId: fromId, toPersonId: toId, type: r.type },
      },
      create: { fromPersonId: fromId, toPersonId: toId, type: r.type, label: r.label },
      update: { label: r.label },
    });
  }

  revalidatePath("/");
  return {};
}
