"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { POST_TYPES } from "@/lib/feed";

export async function getFeed(limit = 50) {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
      relatedPerson: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  return posts;
}

export async function createPost(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const type = (formData.get("type") ?? "").toString();
  const content = (formData.get("content") ?? "").toString().trim();
  const relatedPersonId = (formData.get("relatedPersonId") ?? "").toString() || null;
  if (!POST_TYPES.includes(type as (typeof POST_TYPES)[number])) return { error: "Invalid type" };
  if (!content) return { error: "Content is required" };
  await prisma.post.create({
    data: {
      type,
      content,
      authorId: session.userId,
      relatedPersonId: relatedPersonId || undefined,
    },
  });
  revalidatePath("/feed");
  return { success: true };
}
