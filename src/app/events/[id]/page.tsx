import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/actions/auth";
import { AppHeader } from "@/components/app-header";
import { getEvent, canViewEventParticipantList } from "@/actions/events";
import { getLocale, getT } from "@/lib/i18n";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, event, locale, t] = await Promise.all([
    getCurrentUser(),
    getEvent(id),
    getLocale(),
    getLocale().then((l) => getT(l)),
  ]);
  if (!user) return null;
  if (!event) notFound();

  const canViewList = await canViewEventParticipantList(id);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-xl px-4 py-6">
        <Link href="/events" className="text-sm text-muted-foreground hover:text-foreground">← {t("events.title")}</Link>
        <div className="mt-6 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">{event.name}</h2>
          <div className="text-sm text-muted-foreground mt-2">
            {new Date(event.date).toLocaleString()}
          </div>
          {event.place && (
            <div className="text-sm mt-1">{event.place}</div>
          )}
          <div className="text-sm text-muted-foreground mt-2">
            By {event.createdBy.firstName} {event.createdBy.lastName}
          </div>
          {canViewList && (
            <div className="mt-6 pt-4 border-t">
              <h3 className="font-medium mb-2">{t("events.invitees")}</h3>
              <ul className="space-y-1 text-sm">
                {event.participants.map((p) => (
                  <li key={p.id}>
                    {p.user.firstName} {p.user.lastName}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
