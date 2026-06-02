import Link from "next/link";
import { getLocale, getT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  const t = getT(locale);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-end w-full">
          <LanguageSwitcher />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("forgotPassword.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("forgotPassword.subtitle")}</p>
        </div>
        <ForgotPasswordForm />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/register" className="underline hover:text-foreground">
            {t("lock.createAccount")}
          </Link>
        </p>
      </div>
    </div>
  );
}
