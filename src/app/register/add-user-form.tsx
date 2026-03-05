"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addUser } from "@/actions/auth";
import { useTranslations } from "@/components/i18n-provider";

export function AddUserForm() {
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
    const result = await addUser(formData);
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
        <Label htmlFor="email">{t("lock.email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="firstName">{t("lock.firstName")}</Label>
        <Input id="firstName" name="firstName" type="text" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">{t("lock.lastName")}</Label>
        <Input id="lastName" name="lastName" type="text" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("register.passwordMin")}</Label>
        <Input id="password" name="password" type="password" minLength={6} required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{t("users.userAdded")}</p>}
      <Button type="submit" disabled={loading}>{t("users.addUser")}</Button>
    </form>
  );
}
