"use client";

import { useState } from "react";
import { createGroup } from "@/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/components/i18n-provider";

export function CreateGroupForm() {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await createGroup(formData);
    setLoading(false);
    if (result?.error) setError(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("groups.name")}</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">{t("groups.description")}</Label>
        <Input id="description" name="description" />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPrivate"
          name="isPrivate"
          value="true"
          className="rounded border-input"
        />
        <Label htmlFor="isPrivate" className="font-normal">{t("groups.private")}</Label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>{t("groups.create")}</Button>
    </form>
  );
}
