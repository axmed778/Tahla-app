import { getLocale, getT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LockPageClient } from "./lock-client";

type LockSearchParams = Promise<{
  registered?: string;
  verify?: string;
  reset?: string;
}>;

function resolveBanner(p: {
  registered?: string;
  verify?: string;
  reset?: string;
}): "registered" | "verifySuccess" | "verifyInvalid" | "resetSuccess" | null {
  if (p.registered === "1") return "registered";
  if (p.verify === "success") return "verifySuccess";
  if (p.verify === "invalid") return "verifyInvalid";
  if (p.reset === "success") return "resetSuccess";
  return null;
}

export default async function LockPage({ searchParams }: { searchParams: LockSearchParams }) {
  const locale = await getLocale();
  const t = getT(locale);
  const p = await searchParams;
  const banner = resolveBanner(p);
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
        <LockPageClient banner={banner} />
      </div>
    </div>
  );
}
