import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { AppHeader } from "@/components/app-header";
import { PersonForm } from "@/components/person-form";
import { prisma } from "@/lib/db";
import { getLocale, getT } from "@/lib/i18n";

export default async function ProfileCompletePage() {
  const [user, tags] = await Promise.all([
    getCurrentUser(),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!user) redirect("/lock");
  if (user.personId) redirect("/");

  const t = getT(await getLocale());
  const initial = {
    firstName: user.firstName,
    lastName: user.lastName,
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <h2 className="text-xl font-semibold mb-2">{t("profileComplete.title")}</h2>
        <p className="text-muted-foreground text-sm mb-6">
          {t("profileComplete.subtitle")}
        </p>
        <PersonForm initial={initial} tags={tags} linkToCurrentUser />
      </main>
    </div>
  );
}
