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
      relatedPeople: {
        include: { person: { select: { id: true, firstName: true, middleName: true, lastName: true } } },
      },
    },
  });
  return posts;
}

export async function createPost(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const type = (formData.get("type") ?? "").toString();
  const content = (formData.get("content") ?? "").toString().trim();
  const relatedPersonIdsRaw = formData.get("relatedPersonIds");
  const relatedPersonIds = Array.isArray(relatedPersonIdsRaw)
    ? (relatedPersonIdsRaw as string[]).filter(Boolean)
    : relatedPersonIdsRaw
      ? (relatedPersonIdsRaw.toString().split(",").map((s) => s.trim()).filter(Boolean))
      : [];
  if (!POST_TYPES.includes(type as (typeof POST_TYPES)[number])) return { error: "Invalid type" };
  if (!content) return { error: "Content is required" };
  const post = await prisma.post.create({
    data: {
      type,
      content,
      authorId: session.userId,
    },
  });
  if (relatedPersonIds.length > 0) {
    await prisma.postRelatedPerson.createMany({
      data: relatedPersonIds.map((personId) => ({ postId: post.id, personId })),
      skipDuplicates: true,
    });
  }
  revalidatePath("/feed");
  return { success: true };
}
