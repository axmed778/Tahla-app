"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/actions/auth";
import { useTranslations } from "@/components/i18n-provider";

export type LockBanner = "registered" | "verifySuccess" | "verifyInvalid" | "resetSuccess" | null;

const BANNER_KEYS: Record<Exclude<LockBanner, null>, string> = {
  registered: "lock.bannerRegistered",
  verifySuccess: "lock.bannerVerifySuccess",
  verifyInvalid: "lock.bannerVerifyInvalid",
  resetSuccess: "lock.bannerResetSuccess",
};

type Props = { banner: LockBanner };

export function LockPageClient({ banner }: Props) {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <>
      {banner && (
        <p
          className={`text-sm rounded-md border p-3 ${
            banner === "verifyInvalid" ? "border-destructive/50 bg-destructive/5 text-destructive" : "border-border bg-muted/50 text-muted-foreground"
          }`}
        >
          {t(BANNER_KEYS[banner])}
        </p>
      )}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("lock.email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("lock.emailPlaceholder")}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">{t("lock.password")}</Label>
            <Link href="/forgot-password" className="text-xs underline text-muted-foreground hover:text-foreground">
              {t("lock.forgotPassword")}
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder={t("lock.password")}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {t("lock.signIn")}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t("lock.noAccount")}{" "}
        <Link href="/register" className="underline hover:text-foreground">
          {t("lock.createAccount")}
        </Link>
      </p>
    </>
  );
}
