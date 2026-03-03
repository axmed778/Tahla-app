import Link from "next/link";
import { getCurrentUser } from "@/actions/auth";
import { AppHeader } from "@/components/app-header";
import { getEventsForCurrentUser } from "@/actions/events";
import { getLocale, getT } from "@/lib/i18n";

export default async function EventsPage() {
  const [user, events, locale, t] = await Promise.all([
    getCurrentUser(),
    getEventsForCurrentUser(),
    getLocale(),
    getLocale().then((l) => getT(l)),
  ]);
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">{t("events.title")}</h2>
          <Link href="/events/new">
            <button type="button" className="rounded-md border bg-background px-4 py-2 text-sm font-medium">
              {t("events.newEvent")}
            </button>
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("events.noEvents")}</p>
        ) : (
          <ul className="space-y-3">
            {events.map((ev) => (
              <li key={ev.id}>
                <Link
                  href={`/events/${ev.id}`}
                  className="block rounded-lg border p-4 hover:bg-muted/30"
                >
                  <div className="font-medium">{ev.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(ev.date).toLocaleDateString()} {ev.place && ` · ${ev.place}`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {ev._count.participants} {t("events.participants").toLowerCase()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
