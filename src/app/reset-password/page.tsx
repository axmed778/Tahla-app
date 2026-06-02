import Link from "next/link";
import { getLocale, getT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ResetPasswordForm } from "./reset-password-form";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const t = getT(locale);
  const initialToken = params.token?.trim() ?? "";
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-end w-full">
          <LanguageSwitcher />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("resetPassword.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("resetPassword.subtitle")}</p>
        </div>
        <ResetPasswordForm initialToken={initialToken} />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/lock" className="underline hover:text-foreground">
            {t("register.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
