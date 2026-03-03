import Link from "next/link";
import { getCurrentUser, resetAppData } from "@/actions/auth";
import { AppHeader } from "@/components/app-header";
import { getLocale, getT } from "@/lib/i18n";
import { ChangePasswordForm } from "./change-password-form";
import { ExportImportSection } from "./export-import-section";
import { UsersSection } from "./users-section";
import { DefaultTreeSection } from "./default-tree-section";

export default async function SettingsPage() {
  const [user, locale, t] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    getLocale().then((l) => getT(l)),
  ]);
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-xl px-4 py-6">
        <div className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← {t("settings.back")}</Link>
        </div>
        <h2 className="text-xl font-semibold mb-6">{t("settings.title")}</h2>

        <section className="mb-8">
          <h3 className="font-medium mb-3">{t("settings.changePassword")}</h3>
          <ChangePasswordForm />
        </section>

        <UsersSection currentUserId={user.id} isMaster={user.isMaster} />

        {user.isMaster && <DefaultTreeSection />}

        <section className="mb-8">
          <h3 className="font-medium mb-3">{t("settings.exportImport")}</h3>
          <ExportImportSection />
        </section>

        {user.isMaster && (
          <section className="mb-8">
            <h3 className="font-medium mb-3 text-destructive">{t("settings.masterOnly")}</h3>
            <p className="text-sm text-muted-foreground mb-2">{t("settings.masterOnlyDesc")}</p>
            <form action={resetAppData}>
              <button type="submit" className="text-sm text-destructive underline">{t("settings.resetAppData")}</button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
