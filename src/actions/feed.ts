"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { POST_TYPES } from "@/lib/feed";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { validateImageFile } from "@/lib/file-upload";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function getFeed(limit = 50, groupId?: string | null) {
  const session = await getSession();
  if (!session) return [];

  if (groupId) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: session.userId } },
    });
    if (!member) return [];
  }

  const posts = await prisma.post.findMany({
    where: groupId === undefined ? { groupId: null } : { groupId: groupId ?? null },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
      relatedPeople: {
        include: { person: { select: { id: true, firstName: true, middleName: true, lastName: true } } },
      },
      images: true,
      comments: {
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "asc" },
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
  const groupId = (formData.get("groupId") as string)?.trim() || null;
  const relatedPersonIdsRaw = formData.get("relatedPersonIds");
  const relatedPersonIds = Array.isArray(relatedPersonIdsRaw)
    ? (relatedPersonIdsRaw as string[]).filter(Boolean)
    : relatedPersonIdsRaw
      ? (relatedPersonIdsRaw.toString().split(",").map((s) => s.trim()).filter(Boolean))
      : [];
  if (!POST_TYPES.includes(type as (typeof POST_TYPES)[number])) return { error: "Invalid type" };
  if (!content) return { error: "Content is required" };
  if (groupId) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: session.userId } },
    });
    if (!member) return { error: "You are not a member of this group" };
  }
  const post = await prisma.post.create({
    data: {
      type,
      content,
      authorId: session.userId,
      groupId,
    },
  });
  if (relatedPersonIds.length > 0) {
    await prisma.postRelatedPerson.createMany({
      data: relatedPersonIds.map((personId) => ({ postId: post.id, personId })),
      skipDuplicates: true,
    });
  }
  const files = formData.getAll("photos") as File[];
  if (files?.length) {
    const dir = path.join(process.cwd(), "public", "uploads", "feed");
    await mkdir(dir, { recursive: true });
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file?.size || file.size > MAX_SIZE) continue;
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      const bytes = Buffer.from(await file.arrayBuffer());
      const validated = validateImageFile(bytes, file.type);
      if ("error" in validated) continue;
      const filepath = path.join(dir, validated.filename);
      await writeFile(filepath, bytes);
      await prisma.postImage.create({
        data: { postId: post.id, imageUrl: `/uploads/feed/${validated.filename}` },
      });
    }
  }
  revalidatePath("/feed");
  if (groupId) revalidatePath(`/feed?group=${groupId}`);
  return { success: true };
}

export async function addComment(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not logged in" };
  const postId = (formData.get("postId") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  if (!postId || !content) return { error: "Missing post or content" };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { groupId: true },
  });
  if (!post) return { error: "Post not found" };
  if (post.groupId) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: post.groupId, userId: session.userId } },
    });
    if (!member) return { error: "Not authorized to comment on this post" };
  }

  await prisma.postComment.create({
    data: { postId, authorId: session.userId, content },
  });
  revalidatePath("/feed");
  return { success: true };
}
