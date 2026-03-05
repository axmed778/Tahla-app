"use server";

import { prisma } from "@/lib/db";
import { setSession, clearSession, getSession } from "@/lib/auth";
import { loginSchema, registerSchema, changePasswordSchema, setPasswordByMasterSchema } from "@/lib/validations";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export async function register(formData: FormData) {
  const parsed = registerSchema.safeParse({
    email: (formData.get("email") ?? "").toString().trim().toLowerCase(),
    firstName: (formData.get("firstName") ?? "").toString().trim(),
    lastName: (formData.get("lastName") ?? "").toString().trim(),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return { error: flat.email?.[0] ?? flat.firstName?.[0] ?? flat.lastName?.[0] ?? flat.password?.[0] ?? "Invalid input" };
  }
  const existingByEmail = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existingByEmail) return { error: "This email is already registered." };

  const isFirst = (await prisma.user.count()) === 0;
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      passwordHash,
      isMaster: isFirst,
    },
  });
  await setSession(user.id, user.isMaster);
  redirect("/profile/complete");
}

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: (formData.get("email") ?? "").toString().trim().toLowerCase(),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return { error: flat.email?.[0] ?? flat.password?.[0] ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, isMaster: true, passwordHash: true, person: { select: { id: true } } },
  });
  if (!user) return { error: "No account with this email." };
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return { error: "Wrong password." };

  await setSession(user.id, user.isMaster);
  if (!user.person?.id) redirect("/profile/complete");
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/lock");
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      isMaster: true,
      person: { select: { id: true } },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    isMaster: user.isMaster,
    personId: user.person?.id ?? null,
  };
}

/** Users can only change their own password (no target userId; always session.userId). */
export async function changePassword(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword") ?? "",
    newPassword: formData.get("newPassword") ?? "",
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return { error: flat.currentPassword?.[0] ?? flat.newPassword?.[0] ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: "User not found" };
  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return { error: "Wrong current password" };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: session.userId }, data: { passwordHash } });
  return { success: true };
}

/** App owner only: set a new password for another user (no current password required). */
export async function setUserPasswordAsMaster(formData: FormData) {
  const session = await getSession();
  if (!session?.isMaster) return { error: "Only the app owner can change other users' passwords." };
  const parsed = setPasswordByMasterSchema.safeParse({
    userId: (formData.get("userId") ?? "").toString(),
    newPassword: formData.get("newPassword") ?? "",
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return { error: flat.userId?.[0] ?? flat.newPassword?.[0] ?? "Invalid input" };
  }
  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { error: "User not found" };
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: parsed.data.userId }, data: { passwordHash } });
  return { success: true };
}

// Account changes (add/delete user, change password) are allowed only for:
// - The user themselves (for their own account: change password, delete self)
// - The app owner (isMaster) for any account: add user, delete any user except self
/** App owner only: create a new user (firstName, lastName, password). */
export async function addUser(formData: FormData) {
  const session = await getSession();
  if (!session?.isMaster) return { error: "Only the app owner can add users." };
  const parsed = registerSchema.safeParse({
    email: (formData.get("email") ?? "").toString().trim().toLowerCase(),
    firstName: (formData.get("firstName") ?? "").toString().trim(),
    lastName: (formData.get("lastName") ?? "").toString().trim(),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return { error: flat.email?.[0] ?? flat.firstName?.[0] ?? flat.lastName?.[0] ?? flat.password?.[0] ?? "Invalid input" };
  }
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) return { error: "This email is already registered." };
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      passwordHash,
      isMaster: false,
    },
  });
  return { success: true };
}

/** Only the app owner (master) can delete other users; any user can delete their own account. */
export async function deleteUser(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const userId = (formData.get("userId") ?? "").toString();
  if (!userId) return;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found" };
  const isSelf = session.userId === userId;
  const isMaster = session.isMaster;
  if (!isSelf && !isMaster) return { error: "Only the app owner can delete other users' accounts." };
  if (isSelf) {
    await clearSession();
  }
  await prisma.eventParticipant.deleteMany({ where: { userId } });
  await prisma.event.deleteMany({ where: { createdById: userId } });
  await prisma.friendship.deleteMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
  });
  await prisma.post.deleteMany({ where: { authorId: userId } });
  await prisma.person.updateMany({ where: { userId }, data: { userId: null } });
  await prisma.user.delete({ where: { id: userId } });
  if (isSelf) redirect("/lock");
  return { success: true };
}

export async function setDefaultTreePerson(formData: FormData) {
  const session = await getSession();
  if (!session?.isMaster) return { error: "Only the app owner can set default tree." };
  const personId = (formData.get("personId") ?? "").toString() || null;
  const { revalidatePath } = await import("next/cache");
  await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, defaultTreePersonId: personId },
    update: { defaultTreePersonId: personId },
  });
  revalidatePath("/settings");
  revalidatePath("/tree");
  return { success: true };
}

export async function resetAppData() {
  const session = await getSession();
  if (!session?.isMaster) return { error: "Only the app owner can reset app data." };
  await clearSession();
  await prisma.eventParticipant.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.friendship.deleteMany({});
  await prisma.relationship.deleteMany({});
  await prisma.personTag.deleteMany({});
  await prisma.personPhone.deleteMany({});
  await prisma.personEmail.deleteMany({});
  await prisma.person.updateMany({ data: { userId: null } });
  await prisma.person.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.settings.updateMany({ data: { defaultTreePersonId: null } });
  await prisma.user.deleteMany({});
  redirect("/lock");
}
