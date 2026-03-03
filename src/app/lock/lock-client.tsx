"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/actions/auth";
import { useTranslations } from "@/components/i18n-provider";

export function LockPageClient() {
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
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t("lock.firstName")}</Label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder={t("lock.firstName")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">{t("lock.lastName")}</Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            placeholder={t("lock.lastName")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("lock.password")}</Label>
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
