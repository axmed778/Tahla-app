"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { personQuickAddSchema, personFormSchema } from "@/lib/validations";
import type { z } from "zod";

type PersonFormData = z.infer<typeof personFormSchema>;
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function quickAddPerson(formData: FormData) {
  const parsed = personQuickAddSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
    city: formData.get("city") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[] | undefined> };
  }
  const { firstName, lastName, phone, city } = parsed.data;
  const person = await prisma.person.create({
    data: {
      firstName,
      lastName,
      gender: "OTHER",
      maritalStatus: "SINGLE",
      ...(city && { city }),
    },
  });
  if (phone?.trim()) {
    await prisma.personPhone.create({
      data: { personId: person.id, number: phone.trim() },
    });
  }
  revalidatePath("/");
  redirect(`/people/${person.id}`);
}

export async function createPerson(data: PersonFormData, linkUserId?: string) {
  const parsed = personFormSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[] | undefined> };
  }
  const { phones, emails, tagIds, birthDate, deathDate, ...rest } = parsed.data;
  const person = await prisma.person.create({
    data: {
      ...rest,
      birthDate: birthDate ? new Date(birthDate) : null,
      deathDate: deathDate ? new Date(deathDate) : null,
      ...(linkUserId && { userId: linkUserId }),
    },
  });
  for (const p of phones) {
    await prisma.personPhone.create({ data: { personId: person.id, label: p.label || null, number: p.number } });
  }
  for (const e of emails) {
    await prisma.personEmail.create({ data: { personId: person.id, label: e.label || null, email: e.email } });
  }
  for (const tagId of tagIds) {
    await prisma.personTag.create({ data: { personId: person.id, tagId } });
  }
  revalidatePath("/");
  revalidatePath("/profile/complete");
  redirect(`/people/${person.id}`);
}

/** Create a person and link to the current user (for profile/complete). */
export async function createPersonForCurrentUser(data: PersonFormData) {
  const session = await getSession();
  if (!session) return { error: { _form: ["Not logged in"] } };
  return createPerson(data, session.userId);
}

export async function updatePerson(id: string, data: PersonFormData) {
  const parsed = personFormSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[] | undefined> };
  }
  const { phones, emails, tagIds, birthDate, deathDate, ...rest } = parsed.data;
  await prisma.person.update({
    where: { id },
    data: {
      ...rest,
      birthDate: birthDate ? new Date(birthDate) : null,
      deathDate: deathDate ? new Date(deathDate) : null,
    },
  });
  await prisma.personPhone.deleteMany({ where: { personId: id } });
  await prisma.personEmail.deleteMany({ where: { personId: id } });
  await prisma.personTag.deleteMany({ where: { personId: id } });
  for (const p of phones) {
    await prisma.personPhone.create({ data: { personId: id, label: p.label || null, number: p.number } });
  }
  for (const e of emails) {
    await prisma.personEmail.create({ data: { personId: id, label: e.label || null, email: e.email } });
  }
  for (const tagId of tagIds) {
    await prisma.personTag.create({ data: { personId: id, tagId } });
  }
  revalidatePath("/");
  revalidatePath(`/people/${id}`);
  revalidatePath(`/people/${id}/edit`);
  return { success: true };
}

export async function deletePerson(id: string) {
  await prisma.person.delete({ where: { id } });
  revalidatePath("/");
  redirect("/");
}
