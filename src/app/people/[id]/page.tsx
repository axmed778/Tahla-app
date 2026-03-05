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

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, t] = await Promise.all([getCurrentUser(), getLocale().then((l) => getT(l))]);
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      phones: true,
      emails: true,
      tags: { include: { tag: true } },
      relationshipsFrom: { include: { toPerson: true } },
      relationshipsTo: { include: { fromPerson: true } },
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← {t("common.backToDirectory")}</Link>
          <div className="flex gap-3">
            <Link href={`/tree/${id}`} className="text-sm font-medium" target="_blank" rel="noopener noreferrer">{t("common.viewFullTree")}</Link>
            <Link href={`/people/${id}/edit`} className="text-sm font-medium">{t("common.edit")}</Link>
          </div>
        </div>
        <PersonProfile
          person={person}
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
        />
        <section className="mt-6">
          <AddRelationshipForm fromPersonId={id} otherPeople={allPeople} />
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
