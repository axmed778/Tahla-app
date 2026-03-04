import Link from "next/link";
import { prisma } from "@/lib/db";
import { deleteUser } from "@/actions/auth";
import { getLocale, getT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export async function UsersSection({
  currentUserId,
  isMaster,
}: {
  currentUserId: string;
  isMaster: boolean;
}) {
  const [users, locale, t] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, isMaster: true },
    }),
    getLocale(),
    getLocale().then((l) => getT(l)),
  ]);

  return (
    <section className="mb-8">
      <h3 className="font-medium mb-3">{t("users.manageUsers")}</h3>
      <p className="text-sm text-muted-foreground mb-2">
        {isMaster ? t("users.onlyOwnerCanManage") : t("users.onlyOwnerCanManageOther")}
      </p>
      {isMaster && (
        <Link href="/register">
          <Button variant="outline" size="sm" className="mb-3">{t("users.addUser")}</Button>
        </Link>
      )}
      <ul className="space-y-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between rounded-lg border px-4 py-3 bg-background"
          >
            <span>
              {u.firstName} {u.lastName}
              {u.isMaster && ` (${t("nav.master")})`}
            </span>
            <div className="flex gap-2">
              {isMaster && u.id !== currentUserId && !u.isMaster && (
                <form action={deleteUser}>
                  <input type="hidden" name="userId" value={u.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                    {t("users.deleteUser")}
                  </Button>
                </form>
              )}
              {u.id === currentUserId && (
                <form action={deleteUser}>
                  <input type="hidden" name="userId" value={u.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                    {t("users.deleteMyAccount")}
                  </Button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
