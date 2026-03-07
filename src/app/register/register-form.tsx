"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register } from "@/actions/auth";
import { useTranslations } from "@/components/i18n-provider";

export function RegisterForm() {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await register(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
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
        <Label htmlFor="birthDate">{t("register.birthDate")}</Label>
        <Input
          id="birthDate"
          name="birthDate"
          type="text"
          autoComplete="bday"
          placeholder={t("register.birthDatePlaceholder")}
          maxLength={10}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("register.passwordMin")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder={t("lock.password")}
          minLength={6}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {t("register.createAccount")}
      </Button>
    </form>
  );
}
