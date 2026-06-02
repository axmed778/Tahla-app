import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/actions/auth";
import { prisma } from "@/lib/db";
import { getLocale, getT } from "@/lib/i18n";
import { AppHeader } from "@/components/app-header";
import { formatPersonName } from "@/lib/utils";

export default async function TreeOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/lock");
  if (!user.isMaster) redirect("/tree");

  const [people, t] = await Promise.all([
    prisma.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, middleName: true },
    }),
    getLocale().then((l) => getT(l)),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <Link
          href="/tree"
          className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← {t("nav.familyTree")}
        </Link>
        <h1 className="text-2xl font-bold mb-1">{t("tree.overviewTitle")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("tree.overviewSubtitle")}</p>
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id}>
              <Link
                href={`/tree/${p.id}`}
                className="block rounded-lg border bg-card px-4 py-3 text-card-foreground hover:bg-muted/50 hover:border-primary/50 transition-colors"
              >
                <span className="font-medium">{formatPersonName(p)}</span>
                <span className="ml-2 text-sm text-muted-foreground">→ {t("tree.viewTree")}</span>
              </Link>
            </li>
          ))}
        </ul>
        {people.length === 0 && (
          <p className="text-muted-foreground">{t("directory.noPeopleFound")}</p>
        )}
      </div>
    </div>
  );
}
