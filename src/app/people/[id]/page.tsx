import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { getCurrentUser } from "@/actions/auth";
import { getLocale, getT } from "@/lib/i18n";
import { AppHeader } from "@/components/app-header";
import { getAge, formatDate } from "@/lib/utils";
import { PersonProfile } from "@/components/person-profile";
import { MiniTree } from "@/components/mini-tree";
import { AddRelationshipForm } from "@/components/add-relationship-form";
import { AddDeceasedRelativeButton } from "@/components/add-deceased-relative-button";
import { AddRelativeRequestButton } from "@/components/add-relative-request-button";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, t] = await Promise.all([getCurrentUser(), getLocale().then((l) => getT(l))]);
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      phones: true,
      emails: true,
      privacySettings: true,
      tags: { include: { tag: true } },
      relationshipsFrom: { include: { toPerson: true, fromPerson: true } },
      relationshipsTo: { include: { fromPerson: true, toPerson: true } },
    },
  });
  if (!person) notFound();

  const allPeople = await prisma.person.findMany({
    where: { id: { not: id } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const age = getAge(person.birthDate, person.deathDate);
  const parents = person.relationshipsTo.filter((r) => r.type === "PARENT").map((r) => r.fromPerson);
  const children = person.relationshipsFrom.filter((r) => r.type === "CHILD").map((r) => r.toPerson);
  const siblings = person.relationshipsTo.filter((r) => r.type === "SIBLING").map((r) => r.fromPerson);
  const spouse = person.relationshipsTo.find((r) => r.type === "SPOUSE")?.fromPerson ?? person.relationshipsFrom.find((r) => r.type === "SPOUSE")?.toPerson;
  const other = [...person.relationshipsTo.filter((r) => r.type === "OTHER"), ...person.relationshipsFrom.filter((r) => r.type === "OTHER")].map((r) =>
    r.fromPersonId === person.id
      ? { person: r.toPerson, label: r.label, fromPersonId: r.fromPersonId, toPersonId: r.toPersonId }
      : { person: r.fromPerson, label: r.label, fromPersonId: r.fromPersonId, toPersonId: r.toPersonId }
  );

  const canEdit = !!user && (person.userId === user.id || user.isMaster);

  const isSelf = !!user && (person.userId === user.id || user.personId === person.id);
  const isFamily =
    !!user?.personId &&
    new Set([
      ...parents.map((p) => p.id),
      ...children.map((p) => p.id),
      ...siblings.map((p) => p.id),
      ...(spouse ? [spouse.id] : []),
    ]).has(user.personId);
  const isFriend =
    !!user &&
    !!person.userId &&
    !!(await prisma.friendship.findFirst({
      where: {
        OR: [
          { userAId: user.id, userBId: person.userId },
          { userAId: person.userId, userBId: user.id },
        ],
      },
      select: { id: true },
    }));

  type Visibility = "EVERYONE" | "FRIENDS" | "FAMILY" | "ONLY_ME";
  const canView = (level: Visibility | null | undefined) => {
    if (!user) return false; // "EVERYONE" means all logged-in users
    const v = (level ?? "EVERYONE") as Visibility;
    if (v === "EVERYONE") return true;
    if (v === "ONLY_ME") return isSelf;
    if (v === "FRIENDS") return isSelf || isFriend;
    if (v === "FAMILY") return isSelf || isFamily;
    return false;
  };

  const privacy = person.privacySettings as
    | {
        birthDateVisibility?: Visibility;
        locationVisibility?: Visibility;
        workVisibility?: Visibility;
        maritalStatusVisibility?: Visibility;
        notesVisibility?: Visibility;
      }
    | null;

  const showBirthDate = canEdit || canView(privacy?.birthDateVisibility);
  const showLocation = canEdit || canView(privacy?.locationVisibility);
  const showWork = canEdit || canView(privacy?.workVisibility);
  const showMaritalStatus = canEdit || canView(privacy?.maritalStatusVisibility);
  const showNotes = canEdit || canView(privacy?.notesVisibility);
  const visiblePhones = person.phones.filter((p) => canEdit || canView((p as { visibility?: Visibility }).visibility));
  const visibleEmails = person.emails.filter((e) => canEdit || canView((e as { visibility?: Visibility }).visibility));
  const showContact = canEdit || visiblePhones.length > 0 || visibleEmails.length > 0;

  const targetUserId = person.userId;
  const canRequestRelative = !!user && !!user.personId && !!targetUserId && !canEdit;
  const pendingRequestExists = canRequestRelative
    ? !!(await prisma.relationshipRequest.findFirst({
        where: {
          status: "PENDING",
          OR: [
            { fromUserId: user.id, toUserId: targetUserId },
            { fromUserId: targetUserId, toUserId: user.id },
          ],
        },
        select: { id: true },
      }))
    : false;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← {t("common.backToDirectory")}</Link>
          <div className="flex gap-3 items-center">
            <Link href={`/tree/${id}`} className="text-sm font-medium" target="_blank" rel="noopener noreferrer">{t("common.viewFullTree")}</Link>
            {canEdit && <Link href={`/people/${id}/edit`} className="text-sm font-medium">{t("common.edit")}</Link>}
            {canRequestRelative && !pendingRequestExists && (
              <AddRelativeRequestButton toUserId={targetUserId!} />
            )}
            {canRequestRelative && pendingRequestExists && (
              <span className="text-xs text-muted-foreground">Request pending</span>
            )}
          </div>
        </div>
        <PersonProfile
          person={{ ...person, phones: visiblePhones, emails: visibleEmails }}
          age={age}
          formatDate={formatDate}
          parents={parents}
          children={children}
          siblings={siblings}
          spouse={spouse ?? null}
          other={other}
          t={t}
          canEdit={canEdit}
          currentUserPersonId={user?.personId ?? null}
          showContact={showContact}
          showBirthDate={showBirthDate}
          showLocation={showLocation}
          showWork={showWork}
          showMaritalStatus={showMaritalStatus}
          showNotes={showNotes}
        />
        <section className="mt-6 flex flex-wrap gap-2">
          {user?.isMaster && <AddRelationshipForm fromPersonId={id} otherPeople={allPeople} />}
          {canEdit && (
            <AddDeceasedRelativeButton personId={id} defaultLastName={person.lastName} />
          )}
        </section>
        <section className="mt-8">
          <h3 className="text-lg font-semibold mb-4">{t("profile.miniTreeView")}</h3>
          <MiniTree
            person={person}
            parents={parents}
            spouse={spouse ?? null}
            children={children}
            siblings={siblings}
          />
        </section>
      </main>
    </div>
  );
}
