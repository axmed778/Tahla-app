"use client";

import { useLocale } from "@/components/i18n-provider";
import { setLocale } from "@/actions/locale";
import { SUPPORTED_LOCALES } from "@/lib/i18n-config";
import { Button } from "@/components/ui/button";

const LABELS: Record<string, string> = { en: "EN", az: "AZ", ru: "RU" };

export function LanguageSwitcher() {
  const current = useLocale();
  return (
    <div className="flex items-center gap-1">
      {SUPPORTED_LOCALES.map((loc) => (
        <form key={loc} action={setLocale}>
          <input type="hidden" name="locale" value={loc} />
          <Button
            type="submit"
            variant={current === loc ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2"
          >
            {LABELS[loc] ?? loc}
          </Button>
        </form>
      ))}
    </div>
  );
}
