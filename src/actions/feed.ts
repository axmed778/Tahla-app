"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { POST_TYPES } from "@/lib/feed";
import { createNotification } from "@/actions/notifications";
import { uploadImageToCloudinary } from "@/lib/file-upload";
import { postContentSchema, commentContentSchema } from "@/lib/validations";
import { z } from "zod";

const uuidSchema = z.string().uuid();

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
        include: { person: { select: { id: true, firstName: true, middleName: true, lastName: true, gender: true } } },
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
  const rawIds = Array.isArray(relatedPersonIdsRaw)
    ? (relatedPersonIdsRaw as string[]).filter(Boolean)
    : relatedPersonIdsRaw
      ? relatedPersonIdsRaw.toString().split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  const relatedPersonIds = rawIds.filter((id) => uuidSchema.safeParse(id).success);
  if (!POST_TYPES.includes(type as (typeof POST_TYPES)[number])) return { error: "Invalid type" };
  const contentParsed = postContentSchema.safeParse(content);
  if (!contentParsed.success) return { error: contentParsed.error.issues[0]?.message ?? "Invalid content" };
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
    });
  }
  const files = formData.getAll("photos") as File[];
  if (files?.length) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file?.size || file.size > MAX_SIZE) continue;
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      const bytes = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadImageToCloudinary(bytes, file.type, "feed");
      if ("error" in uploaded) continue;
      await prisma.postImage.create({
        data: { postId: post.id, imageUrl: uploaded.url },
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
  if (!postId) return { error: "Missing post" };
  if (!uuidSchema.safeParse(postId).success) return { error: "Invalid post ID" };
  const contentParsed = commentContentSchema.safeParse(content);
  if (!contentParsed.success) return { error: contentParsed.error.issues[0]?.message ?? "Invalid content" };

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { groupId: true, authorId: true },
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
  if (post.authorId !== session.userId) {
    await createNotification(post.authorId, "FEED_COMMENT", {
      actorId: session.userId,
      meta: { postId },
    });
  }
  revalidatePath("/feed");
  return { success: true };
}
