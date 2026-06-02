import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Random secret for inclusion in a signed URL token (hashed in DB). */
export function generateTokenSecret(): string {
  return randomBytes(32).toString("hex");
}

export async function hashTokenSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, 10);
}

export async function compareTokenSecret(secret: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(secret, hash);
}

/** Format: `{userId}.{secret}` — userId is a UUID, secret is hex from `generateTokenSecret`. */
export function buildUserScopedToken(userId: string, secret: string): string {
  return `${userId}.${secret}`;
}

export function parseUserScopedToken(combined: string): { userId: string; secret: string } | null {
  const i = combined.indexOf(".");
  if (i <= 0 || i >= combined.length - 1) return null;
  const userId = combined.slice(0, i);
  const secret = combined.slice(i + 1);
  if (!UUID_RE.test(userId)) return null;
  if (secret.length < 32) return null;
  return { userId, secret };
}
