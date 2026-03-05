import { prisma } from "@/lib/db";
import { setDefaultTreePerson } from "@/actions/auth";
import { getLocale, getT } from "@/lib/i18n";
import { formatPersonName } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export async function DefaultTreeSection() {
  const [settings, people, locale, t] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, middleName: true, lastName: true },
    }),
    getLocale(),
    getLocale().then((l) => getT(l)),
  ]);

  return (
    <section className="mb-8">
      <h3 className="font-medium mb-3">{t("users.defaultTreeRoot")}</h3>
      <p className="text-sm text-muted-foreground mb-2">{t("users.defaultTreeRootDesc")}</p>
      <form action={setDefaultTreePerson} className="flex gap-2 items-end flex-wrap">
        <select
          name="personId"
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[200px]"
          defaultValue={settings?.defaultTreePersonId ?? ""}
        >
          <option value="">— {t("feed.none")} —</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {formatPersonName(p)}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">Save</Button>
      </form>
    </section>
  );
}
