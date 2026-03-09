import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "tahla_session";
const TTL_HOURS = 24;

function getSecret(): string {
  const secret = process.env.TAHLA_COOKIE_SECRET;
  if (!secret) throw new Error("TAHLA_COOKIE_SECRET env variable is not set");
  return secret;
}

export type SessionPayload = { userId: string; isMaster: boolean };

export async function setSession(userId: string, isMaster: boolean) {
  const secret = new TextEncoder().encode(getSecret());
  const token = await new SignJWT({ userId, isMaster })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${TTL_HOURS}h`)
    .sign(secret);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_HOURS * 60 * 60,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(getSecret());
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;
    if (!userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isMaster: true },
    });
    if (!user) return null;
    return { userId, isMaster: user.isMaster };
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Legacy PIN cookie (kept for migration; can be removed once fully on user auth)
export const TAHLA_UNLOCKED_COOKIE = "tahla_unlocked";
export async function setUnlockedCookie() {
  const secret = new TextEncoder().encode(getSecret());
  const token = await new SignJWT({ u: true })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(secret);
  const cookieStore = await cookies();
  cookieStore.set(TAHLA_UNLOCKED_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 12 * 60 * 60,
    path: "/",
  });
}
export async function isUnlocked(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TAHLA_UNLOCKED_COOKIE)?.value;
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(getSecret());
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}
export async function clearUnlockedCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TAHLA_UNLOCKED_COOKIE);
}
