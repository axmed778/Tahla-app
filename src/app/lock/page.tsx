import { getLocale, getT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LockPageClient } from "./lock-client";

export default async function LockPage() {
  const locale = await getLocale();
  const t = getT(locale);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-end w-full">
          <LanguageSwitcher />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("appName")}</h1>
          <p className="text-muted-foreground mt-1">{t("lock.title")}</p>
        </div>
        <LockPageClient />
      </div>
    </div>
  );
}
