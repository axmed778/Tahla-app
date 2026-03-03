import Link from "next/link";
import { getCurrentUser } from "@/actions/auth";
import { getLocale, getT } from "@/lib/i18n";
import { AddUserForm } from "./add-user-form";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function RegisterPage() {
  const [user, locale, t] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    getLocale().then((l) => getT(l)),
  ]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-end w-full">
          <LanguageSwitcher />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("register.title")}</h1>
          {user?.isMaster ? (
            <p className="text-muted-foreground mt-1">{t("users.addUserSubtitle")}</p>
          ) : (
            <p className="text-muted-foreground mt-1">{t("users.onlyAdminCanAdd")}</p>
          )}
        </div>
        {user?.isMaster ? (
          <AddUserForm />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              {t("users.contactAdminToGetAccount")}
            </p>
            <Link href="/lock">
              <button type="button" className="w-full rounded-md border bg-background px-4 py-2 text-sm font-medium">
                {t("register.signIn")}
              </button>
            </Link>
          </div>
        )}
        {user && (
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/" className="underline hover:text-foreground">{t("common.back")}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
