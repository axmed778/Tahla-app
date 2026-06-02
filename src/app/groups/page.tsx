import { getCurrentUser } from "@/actions/auth";
import { getGroupsForUser, getAvailableGroups } from "@/actions/groups";
import { AppHeader } from "@/components/app-header";
import { getLocale, getT } from "@/lib/i18n";
import Link from "next/link";

export default async function GroupsPage() {
  const [user, myGroups, discoverGroups] = await Promise.all([
    getCurrentUser(),
    getGroupsForUser(),
    getAvailableGroups(),
  ]);
  const locale = await getLocale();
  const t = getT(locale);
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">{t("groups.title")}</h2>
          <Link
            href="/groups/new"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("groups.create")}
          </Link>
        </div>
        <p className="text-muted-foreground text-sm mb-4">{t("groups.subtitle")}</p>

        <section className="mb-8">
          <h3 className="font-medium mb-3">{t("groups.myGroups")}</h3>
          {myGroups.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("groups.noGroups")}</p>
          ) : (
            <ul className="space-y-3">
              {myGroups.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/groups/${g.id}`}
                    className="block rounded-lg border p-4 hover:bg-muted/50"
                  >
                    <span className="font-medium">{g.name}</span>
                    {g.description && (
                      <p className="text-sm text-muted-foreground mt-1">{g.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {g._count.members} {t("groups.members")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="font-medium mb-3">{t("groups.discover")}</h3>
          {discoverGroups.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("groups.noDiscover")}</p>
          ) : (
            <ul className="space-y-3">
              {discoverGroups.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/groups/${g.id}`}
                    className="block rounded-lg border p-4 hover:bg-muted/50"
                  >
                    <span className="font-medium">{g.name}</span>
                    {g.description && (
                      <p className="text-sm text-muted-foreground mt-1">{g.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {g._count.members} {t("groups.members")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
