import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { getCurrentUser } from "@/actions/auth";
import { AppHeader } from "@/components/app-header";
import { PersonForm } from "@/components/person-form";
import { DeletePersonButton } from "./delete-person-button";
import { ProfilePhotoSection } from "./profile-photo-section";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, person] = await Promise.all([
    getCurrentUser(),
    prisma.person.findUnique({
      where: { id },
      include: { phones: true, emails: true, tags: { include: { tag: true } } },
    }),
  ]);
  if (!person) notFound();

  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });

  const visibility = (person as { profileVisibility?: string }).profileVisibility ?? "ALL";
  const initial = {
    firstName: person.firstName,
    lastName: person.lastName,
    middleName: person.middleName ?? "",
    gender: person.gender as "MALE" | "FEMALE" | "OTHER",
    birthDate: person.birthDate ? person.birthDate.toISOString().slice(0, 10) : "",
    deathDate: person.deathDate ? person.deathDate.toISOString().slice(0, 10) : "",
    country: person.country ?? "",
    city: person.city ?? "",
    address: person.address ?? "",
    occupation: person.occupation ?? "",
    workplace: person.workplace ?? "",
    maritalStatus: person.maritalStatus as "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | "OTHER",
    notes: person.notes ?? "",
    profileVisibility: visibility as "ALL" | "FRIENDS" | "FIRST_GEN",
    phones: person.phones.map((p) => ({ id: p.id, label: p.label ?? "", number: p.number })),
    emails: person.emails.map((e) => ({ id: e.id, label: e.label ?? "", email: e.email })),
    tagIds: person.tags.map((t) => t.tagId),
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6">
          <Link href={`/people/${id}`} className="text-sm text-muted-foreground hover:text-foreground">← Back to profile</Link>
        </div>
        <h2 className="text-xl font-semibold mb-6">Edit person</h2>
        <ProfilePhotoSection personId={id} photoUrl={(person as { photoUrl?: string | null }).photoUrl ?? null} />
        <div className="mt-6">
          <PersonForm personId={id} initial={initial} tags={tags} />
        </div>
        <div className="mt-8 pt-6 border-t">
          <DeletePersonButton personId={id} />
        </div>
      </main>
    </div>
  );
}
