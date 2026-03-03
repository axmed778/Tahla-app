"use server";

import { prisma } from "@/lib/db";
import { exportDataSchema, type ExportData } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function getExportData(): Promise<ExportData> {
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
  };
}

export type ImportMode = "replace" | "merge";

export async function importData(json: string, mode: ImportMode): Promise<{ error?: string }> {
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
      for (const ph of p.phones) {
        await prisma.personPhone.create({ data: { personId: existing.id, label: ph.label, number: ph.number } });
      }
      for (const e of p.emails) {
        await prisma.personEmail.create({ data: { personId: existing.id, label: e.label, email: e.email } });
      }
      for (const t of p.tags) {
        const tagId = tagIdMap.get(t.id);
        if (tagId) {
          await prisma.personTag.upsert({
            where: { personId_tagId: { personId: existing.id, tagId } },
            create: { personId: existing.id, tagId },
            update: {},
          });
        }
      }
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
    for (const ph of p.phones) {
      await prisma.personPhone.create({
        data: { id: ph.id, personId: targetId, label: ph.label, number: ph.number },
      });
    }
    for (const e of p.emails) {
      await prisma.personEmail.create({
        data: { id: e.id, personId: targetId, label: e.label, email: e.email },
      });
    }
    for (const t of p.tags) {
      const tagId = tagIdMap.get(t.id);
      if (tagId) {
        await prisma.personTag.create({
          data: { personId: targetId, tagId },
        });
      }
    }
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
