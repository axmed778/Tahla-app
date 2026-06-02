"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/actions/auth";
import { useTranslations } from "@/components/i18n-provider";

export function ForgotPasswordForm() {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await requestPasswordReset(formData);
    setLoading(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{t("forgotPassword.sent")}</p>
        <Link href="/lock" className="text-sm underline hover:text-foreground">
          {t("forgotPassword.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {t("forgotPassword.submit")}
      </Button>
      <p className="text-center text-sm">
        <Link href="/lock" className="underline text-muted-foreground hover:text-foreground">
          {t("forgotPassword.backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
