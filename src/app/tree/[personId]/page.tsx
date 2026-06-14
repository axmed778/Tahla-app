import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/actions/auth";
import { areFriends } from "@/actions/friends";
import { buildFamilyTree } from "@/lib/tree";
import { peopleForKinshipPicker } from "@/actions/kinship";
import { prisma } from "@/lib/db";
import { getLocale, getT } from "@/lib/i18n";
import { AppHeader } from "@/components/app-header";
import { formatPersonName } from "@/lib/utils";
import { TreeView } from "./tree-view";

export default async function TreePage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const t = getT(locale);
  if (!user) return null;

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true, firstName: true, middleName: true, lastName: true, gender: true, userId: true },
  });
  if (!person) notFound();

  const ownerId = person.userId;
  const isMaster = user.isMaster;
  const isOwner = ownerId === user.id;
  const isFriendOfOwner = ownerId ? await areFriends(user.id, ownerId) : false;

  const canView = isMaster || isOwner || isFriendOfOwner;
  if (!canView) notFound();

  const nameOnly = !isMaster && !isOwner;

  const tree = await buildFamilyTree(personId);
  if (!tree) notFound();

  const kinshipPeople = await peopleForKinshipPicker(personId);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <Link
          href="/"
          className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← {t("common.backToDirectory")}
        </Link>
        <h1 className="text-2xl font-bold mb-2">
          {t("tree.title")}: {formatPersonName(person, locale)}
        </h1>
        {nameOnly && (
          <p className="text-sm text-muted-foreground mb-6">
            {t("tree.privacyNotice")}
          </p>
        )}
        <TreeView tree={tree.apex} focus={tree.focus} nameOnly={nameOnly} people={kinshipPeople} />
      </div>
    </div>
  );
}
