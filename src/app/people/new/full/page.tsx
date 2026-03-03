import { prisma } from "@/lib/db";
import Link from "next/link";
import { getCurrentUser } from "@/actions/auth";
import { AppHeader } from "@/components/app-header";
import { PersonForm } from "@/components/person-form";

const emptyInitial = {
  firstName: "",
  lastName: "",
  middleName: "",
  gender: "OTHER" as const,
  birthDate: "",
  deathDate: "",
  country: "",
  city: "",
  address: "",
  occupation: "",
  workplace: "",
  maritalStatus: "SINGLE" as const,
  notes: "",
  phones: [],
  emails: [],
  tagIds: [],
};

export default async function NewPersonFullPage() {
  const [user, tags] = await Promise.all([
    getCurrentUser(),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6">
          <Link href="/people/new" className="text-sm text-muted-foreground hover:text-foreground">← Quick add</Link>
        </div>
        <h2 className="text-xl font-semibold mb-6">Add person (full form)</h2>
        <PersonForm initial={emptyInitial} tags={tags} />
      </main>
    </div>
  );
}
