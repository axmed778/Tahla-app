"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/actions/auth";
import { useTranslations } from "@/components/i18n-provider";

export function ChangePasswordForm() {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await changePassword(formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    form.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">{t("settings.currentPassword")}</Label>
        <Input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
        <Input id="newPassword" name="newPassword" type="password" minLength={6} required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{t("settings.passwordChanged")}</p>}
      <Button type="submit" disabled={loading}>{t("settings.changePasswordButton")}</Button>
    </form>
  );
}
