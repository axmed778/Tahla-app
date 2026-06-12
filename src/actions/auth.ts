"use server";

import { Prisma } from "@prisma/client";
import { PrismaClientInitializationError } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db";
import { setSession, clearSession, getSession } from "@/lib/auth";
import { deleteStoredImage } from "@/lib/file-upload";
import {
  loginSchema,
  registerSchema,
  addUserSchema,
  changePasswordSchema,
  setPasswordByMasterSchema,
  forgotPasswordSchema,
  resetPasswordWithTokenSchema,
} from "@/lib/validations";
import { resolveClanForRegistration } from "@/actions/clans";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { getLocale, getT } from "@/lib/i18n";
import { authRatelimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import {
  buildUserScopedToken,
  compareTokenSecret,
  generateTokenSecret,
  hashTokenSecret,
  parseUserScopedToken,
} from "@/lib/tokens";

function isNextRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest: string }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function register(formData: FormData) {
  const locale = await getLocale();
  const t = getT(locale);

  const parsed = registerSchema.safeParse({
    email: (formData.get("email") ?? "").toString().trim().toLowerCase(),
    firstName: (formData.get("firstName") ?? "").toString().trim(),
    lastName: (formData.get("lastName") ?? "").toString().trim(),
    password: formData.get("password") ?? "",
    birthDate: (formData.get("birthDate") as string)?.trim() || undefined,
    clanId: (formData.get("clanId") as string)?.trim() || undefined,
    newClanName: (formData.get("newClanName") as string)?.trim() || undefined,
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return { error: flat.email?.[0] ?? flat.firstName?.[0] ?? flat.lastName?.[0] ?? flat.password?.[0] ?? flat.birthDate?.[0] ?? flat.clanId?.[0] ?? flat.newClanName?.[0] ?? "Invalid input" };
  }

  try {
    const normalizedEmail = parsed.data.email.toLowerCase();
    const existingByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingByEmail) return { error: t("register.duplicateEmail") };

    const clanResult = await resolveClanForRegistration({
      clanId: parsed.data.clanId,
      newClanName: parsed.data.newClanName,
    });
    if ("error" in clanResult) return { error: clanResult.error };
    const clanId = clanResult.clanId;

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const birthDateParsed = parsed.data.birthDate
      ? (() => {
          const [y, m, d] = parsed.data.birthDate!.split("-").map(Number);
          return new Date(y, m - 1, d);
        })()
      : null;

    const userCount = await prisma.user.count();
    const isFirst = userCount === 0;
    const emailVerified = isFirst;

    if (emailVerified) {
      const user = await prisma.$transaction(async (tx) => {
        return tx.user.create({
          data: {
            email: normalizedEmail,
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            passwordHash,
            birthDate: birthDateParsed,
            isMaster: isFirst,
            clanId,
            emailVerified: true,
          },
        });
      });
      await setSession(user.id, user.isMaster);
      redirect("/profile/complete");
    }

    const verifySecret = generateTokenSecret();
    const verifyHash = await hashTokenSecret(verifySecret);
    const verifyExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        passwordHash,
        birthDate: birthDateParsed,
        isMaster: false,
        clanId,
        emailVerified: false,
        verifyTokenHash: verifyHash,
        verifyTokenExpires: verifyExpires,
      },
    });

    const verificationToken = buildUserScopedToken(user.id, verifySecret);
    const sendResult = await sendVerificationEmail(user.email, verificationToken);
    if (!sendResult.ok) {
      console.error("[auth] Verification email failed:", sendResult.error);
    }
    redirect("/lock?registered=1");
  } catch (e) {
    if (isNextRedirectError(e)) throw e;
    if (e instanceof PrismaClientInitializationError) {
      console.error("[auth] register database unreachable", e);
      return { error: t("register.dbUnavailable") };
    }
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      (e.code === "P1001" || e.code === "P1008" || e.code === "P1017")
    ) {
      console.error("[auth] register database query error", e.code, e);
      return { error: t("register.dbUnavailable") };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const raw = e.meta?.target;
      const fields = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
      if (fields.includes("email")) {
        return { error: t("register.duplicateEmail") };
      }
      return { error: t("register.duplicateName") };
    }
    console.error("[auth] register", e);
    return { error: t("register.unexpectedError") };
  }
}

export async function login(formData: FormData) {
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const { success } = await authRatelimit.limit(`login:${ip}`);
  if (!success) return { error: "Too many attempts. Try again in 15 minutes." };

  const parsed = loginSchema.safeParse({
    email: (formData.get("email") ?? "").toString().trim().toLowerCase(),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return { error: flat.email?.[0] ?? flat.password?.[0] ?? "Invalid input" };
  }

  const locale = await getLocale();
  const t = getT(locale);

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      isMaster: true,
      passwordHash: true,
      emailVerified: true,
      verifyTokenHash: true,
      person: { select: { id: true } },
    },
  });
  if (!user) {
    await new Promise((res) => setTimeout(res, 500));
    return { error: "Invalid email or password." };
  }
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    await new Promise((res) => setTimeout(res, 500));
    return { error: "Invalid email or password." };
  }

  // Block only accounts that registered and still have a pending email verification token.
  // Legacy rows (e.g. `prisma db push` added `emailVerified` false for everyone) have no token — fix and allow.
  if (!user.emailVerified) {
    if (user.verifyTokenHash) {
      await new Promise((res) => setTimeout(res, 500));
      return { error: t("lock.unverifiedEmail") };
    }
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  }

  await setSession(user.id, user.isMaster);
  if (!user.person?.id) redirect("/profile/complete");
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/lock");
}

export async function requestPasswordReset(formData: FormData) {
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const { success } = await authRatelimit.limit(`reset:${ip}`);
  if (!success) return { error: "Too many attempts. Try again later." };

  const parsed = forgotPasswordSchema.safeParse({
    email: (formData.get("email") ?? "").toString().trim().toLowerCase(),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.email?.[0] ?? "Invalid email" };
  }
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true },
  });
  if (user) {
    const secret = generateTokenSecret();
    const hash = await hashTokenSecret(secret);
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: hash,
        passwordResetExpires: expires,
      },
    });
    const token = buildUserScopedToken(user.id, secret);
    await sendPasswordResetEmail(user.email, token);
  }
  await new Promise((r) => setTimeout(r, 400));
  return { success: true as const };
}

export async function resetPasswordWithToken(formData: FormData) {
  const parsed = resetPasswordWithTokenSchema.safeParse({
    token: (formData.get("token") ?? "").toString(),
    newPassword: formData.get("newPassword") ?? "",
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return { error: flat.token?.[0] ?? flat.newPassword?.[0] ?? "Invalid input" };
  }
  const parts = parseUserScopedToken(parsed.data.token);
  if (!parts) return { error: "Invalid or expired link." };
  const user = await prisma.user.findUnique({
    where: { id: parts.userId },
    select: { passwordResetTokenHash: true, passwordResetExpires: true },
  });
  if (!user?.passwordResetExpires || user.passwordResetExpires < new Date()) {
    return { error: "Invalid or expired link." };
  }
  const match = await compareTokenSecret(parts.secret, user.passwordResetTokenHash);
  if (!match) return { error: "Invalid or expired link." };
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: parts.userId },
    data: {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpires: null,
    },
  });
  redirect("/lock?reset=success");
}

export async function verifyEmailToken(token: string): Promise<{ ok: boolean }> {
  const parts = parseUserScopedToken(token.trim());
  if (!parts) return { ok: false };
  const user = await prisma.user.findUnique({
    where: { id: parts.userId },
    select: { emailVerified: true, verifyTokenHash: true, verifyTokenExpires: true },
  });
  if (!user) return { ok: false };
  if (user.emailVerified) return { ok: true };
  if (!user.verifyTokenExpires || user.verifyTokenExpires < new Date()) return { ok: false };
  const match = await compareTokenSecret(parts.secret, user.verifyTokenHash);
  if (!match) return { ok: false };
  await prisma.user.update({
    where: { id: parts.userId },
    data: {
      emailVerified: true,
      verifyTokenHash: null,
      verifyTokenExpires: null,
    },
  });
  return { ok: true };
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
      birthDate: true,
      isMaster: true,
      person: { select: { id: true } },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    birthDate: user.birthDate ?? null,
    isMaster: user.isMaster,
    personId: user.person?.id ?? null,
  };
}

/** Stub: PIN lock / change PIN not yet implemented. */
export async function changePin(_formData: FormData) {
  return { error: "PIN lock is not configured." };
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
  const parsed = addUserSchema.safeParse({
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
      emailVerified: true,
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

  // Collect URLs before deleting rows, then remove files after the transaction.
  const [eventsWithPhotos, postImages] = await Promise.all([
    prisma.event.findMany({
      where: { createdById: userId, imageUrl: { not: null } },
      select: { imageUrl: true },
    }),
    prisma.postImage.findMany({
      where: { post: { authorId: userId } },
      select: { imageUrl: true },
    }),
  ]);

  await prisma.$transaction([
    prisma.eventParticipant.deleteMany({ where: { userId } }),
    prisma.event.deleteMany({ where: { createdById: userId } }),
    prisma.post.deleteMany({ where: { authorId: userId } }),
    prisma.friendship.deleteMany({ where: { OR: [{ userAId: userId }, { userBId: userId }] } }),
    prisma.person.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  for (const e of eventsWithPhotos) await deleteStoredImage(e.imageUrl);
  for (const img of postImages) await deleteStoredImage(img.imageUrl);

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
  const allEventPhotos = await prisma.event.findMany({
    where: { imageUrl: { not: null } },
    select: { imageUrl: true },
  });
  for (const e of allEventPhotos) {
    await deleteStoredImage(e.imageUrl);
  }
  await prisma.event.deleteMany({});
  await prisma.groupApplication.deleteMany({});
  await prisma.groupMember.deleteMany({});
  const allPostImages = await prisma.postImage.findMany({ select: { imageUrl: true } });
  for (const img of allPostImages) {
    await deleteStoredImage(img.imageUrl);
  }
  const peopleWithPhotos = await prisma.person.findMany({
    where: { photoUrl: { not: null } },
    select: { photoUrl: true },
  });
  for (const p of peopleWithPhotos) {
    await deleteStoredImage(p.photoUrl);
  }
  await prisma.post.deleteMany({});
  await prisma.group.deleteMany({});
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

/** Void-returning wrappers for use as form actions (so they serialize and satisfy React types). */
export async function resetAppDataFormAction() {
  await resetAppData();
}

export async function setDefaultTreePersonFormAction(formData: FormData) {
  await setDefaultTreePerson(formData);
}

export async function deleteUserFormAction(formData: FormData) {
  await deleteUser(formData);
}
