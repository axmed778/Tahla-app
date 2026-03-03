import { getCurrentUser } from "@/actions/auth";
import { AppHeader } from "@/components/app-header";
import { prisma } from "@/lib/db";
import { getLocale, getT } from "@/lib/i18n";
import { NewEventForm } from "./new-event-form";

export default async function NewEventPage() {
  const [user, users, locale, t] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    getLocale(),
    getLocale().then((l) => getT(l)),
  ]);
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-xl px-4 py-6">
        <h2 className="text-xl font-semibold mb-6">{t("events.newEvent")}</h2>
        <NewEventForm users={users} />
      </main>
    </div>
  );
}
