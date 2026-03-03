import { notFound } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { areFriends } from "@/actions/friends";
import { buildTree } from "@/lib/tree";
import { prisma } from "@/lib/db";
import { TreeView } from "./tree-view";

export default async function TreePage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true, firstName: true, lastName: true, userId: true },
  });
  if (!person) notFound();

  const ownerId = person.userId;
  const isMaster = user.isMaster;
  const isOwner = ownerId === user.id;
  const isFriendOfOwner = ownerId ? await areFriends(user.id, ownerId) : false;

  const canView = isMaster || isOwner || isFriendOfOwner;
  if (!canView) notFound();

  const nameOnly = !isMaster && !isOwner;

  const tree = await buildTree(personId);
  if (!tree) notFound();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">
          Family tree: {tree.firstName} {tree.lastName}
        </h1>
        {nameOnly && (
          <p className="text-sm text-muted-foreground mb-6">
            Privacy: only names are shown. You are viewing as a friend.
          </p>
        )}
        <TreeView node={tree} nameOnly={nameOnly} />
      </div>
    </div>
  );
}
