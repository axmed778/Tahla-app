"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordWithToken } from "@/actions/auth";
import { useTranslations } from "@/components/i18n-provider";

type Props = { initialToken: string };

export function ResetPasswordForm({ initialToken }: Props) {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await resetPasswordWithToken(formData);
    if (result && "error" in result && result.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  if (!initialToken.trim()) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-destructive">{t("resetPassword.missingToken")}</p>
        <Link href="/forgot-password" className="text-sm underline hover:text-foreground">
          {t("forgotPassword.title")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="token" value={initialToken} />
      <div className="space-y-2">
        <Label htmlFor="newPassword">{t("resetPassword.newPassword")}</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {t("resetPassword.submit")}
      </Button>
      <p className="text-center text-sm">
        <Link href="/lock" className="underline text-muted-foreground hover:text-foreground">
          {t("forgotPassword.backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
