"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { personQuickAddSchema, personFormSchema } from "@/lib/validations";
import type { z } from "zod";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { validateImageFile } from "@/lib/file-upload";

type PersonFormData = z.infer<typeof personFormSchema>;
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function quickAddPerson(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: { _form: ["Not logged in"] } };

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
  const { phones, emails, tagIds, birthDate, deathDate, profileVisibility, ...rest } = parsed.data;
  const person = await prisma.person.create({
    data: {
      ...rest,
      birthDate: birthDate ? new Date(birthDate) : null,
      deathDate: deathDate ? new Date(deathDate) : null,
      profileVisibility: profileVisibility ?? "ALL",
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
  const session = await getSession();
  if (!session) return { error: { _form: ["Not logged in"] } };
  if (!(await canEditPerson(id))) return { error: { _form: ["Not allowed to edit this profile"] } };

  const parsed = personFormSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[] | undefined> };
  }
  const { phones, emails, tagIds, birthDate, deathDate, profileVisibility, ...rest } = parsed.data;
  await prisma.person.update({
    where: { id },
    data: {
      ...rest,
      birthDate: birthDate ? new Date(birthDate) : null,
      deathDate: deathDate ? new Date(deathDate) : null,
      ...(profileVisibility != null && { profileVisibility }),
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
  const session = await getSession();
  if (!session) return { error: "Not logged in" };

  const person = await prisma.person.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!person) return { error: "Person not found" };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isMaster: true },
  });
  const isOwner = person.userId === session.userId;
  const isMaster = user?.isMaster === true;
  if (!isOwner && !isMaster) return { error: "Only the profile owner or app owner can delete this person" };

  await prisma.person.delete({ where: { id } });
  revalidatePath("/");
  redirect("/");
}

async function canEditPerson(personId: string) {
  const session = await getSession();
  if (!session) return false;
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { userId: true },
  });
  if (!person) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isMaster: true },
  });
  return !!user && (person.userId === session.userId || user.isMaster);
}

export async function uploadPersonPhoto(formData: FormData) {
  const personId = (formData.get("personId") as string)?.trim();
  if (!personId) return { error: "Missing personId" };
  if (!(await canEditPerson(personId))) return { error: "Not allowed to edit this profile" };

  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return { error: "No file" };
  if (file.size > MAX_SIZE) return { error: "File too large (max 5MB)" };
  if (!ALLOWED_TYPES.includes(file.type)) return { error: "Only JPEG, PNG and WebP are allowed" };

  const bytes = Buffer.from(await file.arrayBuffer());
  const validated = validateImageFile(bytes, file.type);
  if ("error" in validated) return { error: validated.error };

  const filename = validated.filename;
  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(dir, { recursive: true });
  const filepath = path.join(dir, filename);
  await writeFile(filepath, bytes);

  const photoUrl = `/uploads/avatars/${filename}`;
  await prisma.person.update({
    where: { id: personId },
    data: { photoUrl },
  });

  revalidatePath("/");
  revalidatePath(`/people/${personId}`);
  revalidatePath(`/people/${personId}/edit`);
  return { success: true };
}

export async function removePersonPhoto(formData: FormData) {
  const personId = (formData.get("personId") as string)?.trim();
  if (!personId) return { error: "Missing personId" };
  if (!(await canEditPerson(personId))) return { error: "Not allowed to edit this profile" };

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { photoUrl: true },
  });
  if (person?.photoUrl?.startsWith("/uploads/")) {
    try {
      const filepath = path.join(process.cwd(), "public", person.photoUrl);
      await unlink(filepath);
    } catch {
      // ignore if file already missing
    }
  }

  await prisma.person.update({
    where: { id: personId },
    data: { photoUrl: null },
  });

  revalidatePath("/");
  revalidatePath(`/people/${personId}`);
  revalidatePath(`/people/${personId}/edit`);
  return { success: true };
}
