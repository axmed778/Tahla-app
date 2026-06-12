"use server";

import { prisma } from "@/lib/db";
import { normalizeClanName } from "@/lib/clan";

export type ClanOption = { id: string; name: string };

/** Public: list all clans for the registration dropdown. */
export async function listClans(): Promise<ClanOption[]> {
  const clans = await prisma.clan.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return clans;
}

/**
 * Resolve the clan for a registering user: either an existing clan id, or a new
 * clan name to create. Returns the clan id or a user-facing error.
 * New clan names must be unique case-insensitively.
 */
export async function resolveClanForRegistration(input: {
  clanId?: string;
  newClanName?: string;
}): Promise<{ clanId: string } | { error: string }> {
  const newName = input.newClanName?.trim();
  if (newName) {
    const normalized = normalizeClanName(newName);
    if (!normalized) return { error: "Clan name is required." };
    const existing = await prisma.clan.findUnique({
      where: { nameNormalized: normalized },
      select: { id: true },
    });
    if (existing) return { error: "A clan with this name already exists. Select it from the list." };
    try {
      const clan = await prisma.clan.create({
        data: { name: newName, nameNormalized: normalized },
        select: { id: true },
      });
      return { clanId: clan.id };
    } catch {
      // Unique race: another request created the same clan first — reuse it.
      const fallback = await prisma.clan.findUnique({
        where: { nameNormalized: normalized },
        select: { id: true },
      });
      if (fallback) return { clanId: fallback.id };
      return { error: "Could not create clan. Please try again." };
    }
  }

  if (input.clanId) {
    const clan = await prisma.clan.findUnique({
      where: { id: input.clanId },
      select: { id: true },
    });
    if (!clan) return { error: "Selected clan no longer exists." };
    return { clanId: clan.id };
  }

  return { error: "Please select a clan or create a new one." };
}
