"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register } from "@/actions/auth";
import { useTranslations } from "@/components/i18n-provider";
import type { ClanOption } from "@/actions/clans";

const NEW_CLAN = "__new__";

function isNextRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest: string }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function RegisterForm({ clans }: { clans: ClanOption[] }) {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clanChoice, setClanChoice] = useState<string>("");

  const creatingNewClan = clanChoice === NEW_CLAN;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      // The clan <select> uses a sentinel value for "create new"; never send it as clanId.
      if (creatingNewClan) {
        formData.delete("clanId");
      } else {
        formData.delete("newClanName");
      }
      const result = await register(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    } catch (err) {
      if (isNextRedirectError(err)) throw err;
      console.error(err);
      setError(t("register.unexpectedError"));
    } finally {
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
          type="date"
          autoComplete="bday"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="clanId">{t("register.clan")}</Label>
        <select
          id="clanId"
          name="clanId"
          value={clanChoice}
          onChange={(e) => setClanChoice(e.target.value)}
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="" disabled>
            {t("register.clanSelect")}
          </option>
          {clans.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value={NEW_CLAN}>{t("register.clanCreateNew")}</option>
        </select>
      </div>
      {creatingNewClan && (
        <div className="space-y-2">
          <Label htmlFor="newClanName">{t("register.clanNewName")}</Label>
          <Input
            id="newClanName"
            name="newClanName"
            type="text"
            placeholder={t("register.clanNewNamePlaceholder")}
            maxLength={100}
            required
          />
        </div>
      )}
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
