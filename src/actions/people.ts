"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { personQuickAddSchema, personFormSchema, deceasedRelativeSchema, type DeceasedRelativeData } from "@/lib/validations";
import type { z } from "zod";
import { deleteStoredImage, uploadImageToCloudinary } from "@/lib/file-upload";
import { combinePhone } from "@/lib/phone-codes";

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
  await prisma.personPrivacySettings.upsert({
    where: { personId: person.id },
    create: { personId: person.id },
    update: {},
  });
  if (phone?.trim()) {
    await prisma.personPhone.create({
      data: { personId: person.id, number: phone.trim() },
    });
  }
  revalidatePath("/");
  redirect(`/people/${person.id}`);
}

/**
 * Create a Person record (with phones/emails/tags/privacy). Returns the new person id or
 * a field-error object. Does NOT redirect, so callers can route as needed.
 */
async function createPersonRecord(
  data: PersonFormData,
  linkUserId?: string
): Promise<{ personId: string } | { error: Record<string, string[] | undefined> }> {
  const session = await getSession();
  if (!session) return { error: { _form: ["Not logged in"] } };
  // Non-master callers may only link themselves; master may link any user.
  if (linkUserId && linkUserId !== session.userId && !session.isMaster) {
    return { error: { _form: ["Not allowed to link another user's profile"] } };
  }
  const parsed = personFormSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[] | undefined> };
  }
  const { phones, emails, tagIds, birthDate, deathDate, profileVisibility, privacy, ...rest } = parsed.data;
  const person = await prisma.person.create({
    data: {
      ...rest,
      birthDate: birthDate ? new Date(birthDate) : null,
      deathDate: deathDate ? new Date(deathDate) : null,
      profileVisibility: profileVisibility ?? "ALL",
      ...(linkUserId && { userId: linkUserId }),
      privacySettings: {
        create: {
          birthDateVisibility: privacy?.birthDate ?? "EVERYONE",
          locationVisibility: privacy?.location ?? "EVERYONE",
          workVisibility: privacy?.work ?? "EVERYONE",
          maritalStatusVisibility: privacy?.maritalStatus ?? "EVERYONE",
          notesVisibility: privacy?.notes ?? "EVERYONE",
        },
      },
    },
  });
  for (const p of phones) {
    await prisma.personPhone.create({
      data: {
        personId: person.id,
        label: null,
        number: combinePhone(p.dialCode, p.number),
        visibility: p.visibility ?? "EVERYONE",
      },
    });
  }
  for (const e of emails) {
    await prisma.personEmail.create({
      data: {
        personId: person.id,
        label: e.label || null,
        email: e.email,
        visibility: e.visibility ?? "EVERYONE",
      },
    });
  }
  for (const tagId of tagIds) {
    await prisma.personTag.create({ data: { personId: person.id, tagId } });
  }
  revalidatePath("/");
  revalidatePath("/profile/complete");
  return { personId: person.id };
}

export async function createPerson(data: PersonFormData, linkUserId?: string) {
  const result = await createPersonRecord(data, linkUserId);
  if ("error" in result) return result;
  redirect(`/people/${result.personId}`);
}

/** Create a person and link to the current user (for profile/complete). */
export async function createPersonForCurrentUser(data: PersonFormData) {
  const session = await getSession();
  if (!session) return { error: { _form: ["Not logged in"] } };
  return createPerson(data, session.userId);
}

/**
 * Onboarding variant: create the current user's person, then route to the father-detection
 * step (/profile/father) instead of the person page.
 */
export async function createPersonForCurrentUserOnboarding(data: PersonFormData) {
  const session = await getSession();
  if (!session) return { error: { _form: ["Not logged in"] } };
  const result = await createPersonRecord(data, session.userId);
  if ("error" in result) return result;
  redirect("/profile/father");
}

/**
 * Quick-add a deceased person and link them to an existing person in a single step.
 * Used to build the tree upward (e.g. add a deceased father/ancestor) without a full
 * profile or a user account. The caller must be able to edit the existing person
 * (its owner, or the app owner). Relationship edges mirror `addRelationship`.
 */
export async function addDeceasedRelative(
  relativeOfPersonId: string,
  data: DeceasedRelativeData
): Promise<{ success: true; personId: string } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  if (!(await canEditPerson(relativeOfPersonId))) {
    return { error: "Not allowed to add relatives to this profile." };
  }
  const parsed = deceasedRelativeSchema.safeParse(data);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      error:
        flat.firstName?.[0] ??
        flat.lastName?.[0] ??
        flat.gender?.[0] ??
        flat.birthDate?.[0] ??
        flat.deathDate?.[0] ??
        flat.relationship?.[0] ??
        "Invalid input",
    };
  }
  const { firstName, lastName, gender, birthDate, deathDate, relationship } = parsed.data;

  const existing = await prisma.person.findUnique({
    where: { id: relativeOfPersonId },
    select: { id: true },
  });
  if (!existing) return { error: "Person not found." };

  const deceased = await prisma.person.create({
    data: {
      firstName,
      lastName,
      gender,
      maritalStatus: "SINGLE",
      birthDate: birthDate ? new Date(birthDate) : null,
      deathDate: deathDate ? new Date(deathDate) : null,
      profileVisibility: "ALL",
      privacySettings: { create: {} },
    },
  });

  const upsertEdge = async (fromPersonId: string, toPersonId: string, type: string) => {
    await prisma.relationship.upsert({
      where: { fromPersonId_toPersonId_type: { fromPersonId, toPersonId, type } },
      create: { fromPersonId, toPersonId, type },
      update: {},
    });
  };

  // Resolve the parent/child direction, then store the same pair as PARENT and CHILD
  // (mirroring confirmFather/addRelationship) so the tree reads both directions.
  if (relationship === "PARENT" || relationship === "CHILD") {
    const parentId = relationship === "PARENT" ? deceased.id : relativeOfPersonId;
    const childId = relationship === "PARENT" ? relativeOfPersonId : deceased.id;
    await upsertEdge(parentId, childId, "PARENT");
    await upsertEdge(parentId, childId, "CHILD");
  } else {
    // SIBLING / SPOUSE are symmetric: store both directions with the same type.
    await upsertEdge(relativeOfPersonId, deceased.id, relationship);
    await upsertEdge(deceased.id, relativeOfPersonId, relationship);
  }

  revalidatePath("/");
  revalidatePath(`/people/${relativeOfPersonId}`);
  revalidatePath(`/people/${deceased.id}`);
  return { success: true, personId: deceased.id };
}

export async function updatePerson(id: string, data: PersonFormData) {
  const session = await getSession();
  if (!session) return { error: { _form: ["Not logged in"] } };
  if (!(await canEditPerson(id))) return { error: { _form: ["Not allowed to edit this profile"] } };

  const parsed = personFormSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[] | undefined> };
  }
  const { phones, emails, tagIds, birthDate, deathDate, profileVisibility, privacy, ...rest } = parsed.data;
  await prisma.person.update({
    where: { id },
    data: {
      ...rest,
      birthDate: birthDate ? new Date(birthDate) : null,
      deathDate: deathDate ? new Date(deathDate) : null,
      ...(profileVisibility != null && { profileVisibility }),
    },
  });
  await prisma.personPrivacySettings.upsert({
    where: { personId: id },
    create: {
      personId: id,
      birthDateVisibility: privacy?.birthDate ?? "EVERYONE",
      locationVisibility: privacy?.location ?? "EVERYONE",
      workVisibility: privacy?.work ?? "EVERYONE",
      maritalStatusVisibility: privacy?.maritalStatus ?? "EVERYONE",
      notesVisibility: privacy?.notes ?? "EVERYONE",
    },
    update: {
      birthDateVisibility: privacy?.birthDate ?? "EVERYONE",
      locationVisibility: privacy?.location ?? "EVERYONE",
      workVisibility: privacy?.work ?? "EVERYONE",
      maritalStatusVisibility: privacy?.maritalStatus ?? "EVERYONE",
      notesVisibility: privacy?.notes ?? "EVERYONE",
    },
  });
  await prisma.personPhone.deleteMany({ where: { personId: id } });
  await prisma.personEmail.deleteMany({ where: { personId: id } });
  await prisma.personTag.deleteMany({ where: { personId: id } });
  for (const p of phones) {
    await prisma.personPhone.create({
      data: {
        personId: id,
        label: null,
        number: combinePhone(p.dialCode, p.number),
        visibility: p.visibility ?? "EVERYONE",
      },
    });
  }
  for (const e of emails) {
    await prisma.personEmail.create({
      data: {
        personId: id,
        label: e.label || null,
        email: e.email,
        visibility: e.visibility ?? "EVERYONE",
      },
    });
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
    select: { userId: true, photoUrl: true },
  });
  if (!person) return { error: "Person not found" };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isMaster: true },
  });
  const isOwner = person.userId === session.userId;
  const isMaster = user?.isMaster === true;
  if (!isOwner && !isMaster) return { error: "Only the profile owner or app owner can delete this person" };

  await deleteStoredImage(person.photoUrl);
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
  const uploaded = await uploadImageToCloudinary(bytes, file.type, "avatars");
  if ("error" in uploaded) return { error: uploaded.error };

  const existing = await prisma.person.findUnique({
    where: { id: personId },
    select: { photoUrl: true },
  });
  await deleteStoredImage(existing?.photoUrl);

  await prisma.person.update({
    where: { id: personId },
    data: { photoUrl: uploaded.url },
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
  await deleteStoredImage(person?.photoUrl);

  await prisma.person.update({
    where: { id: personId },
    data: { photoUrl: null },
  });

  revalidatePath("/");
  revalidatePath(`/people/${personId}`);
  revalidatePath(`/people/${personId}/edit`);
  return { success: true };
}
