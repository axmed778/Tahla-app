"use client";

import { useLocale } from "@/components/i18n-provider";
import { setLocale } from "@/actions/locale";
import { SUPPORTED_LOCALES } from "@/lib/i18n-config";
import { useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = { en: "EN", az: "AZ", ru: "RU" };

const CLOUDY_DROPDOWN =
  "border-0 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08),0_12px_40px_rgba(0,0,0,0.06)] min-w-0 w-20 [&>*:nth-child(2)]:!min-w-0 [&>*:nth-child(2)]:!w-full";

export function LanguageSwitcher() {
  const current = useLocale();
  const formRef = useRef<HTMLFormElement>(null);

  function handleChange(value: string) {
    const input = formRef.current?.querySelector(
      'input[name="locale"]'
    ) as HTMLInputElement | null;
    if (input) {
      input.value = value;
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} action={setLocale} className="flex items-center">
      <input type="hidden" name="locale" value={current} />
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger
          className={cn(
            "h-9 w-[72px] border-0 bg-background/80 shadow-[0_2px_12px_rgba(0,0,0,0.08),0_4px_24px_rgba(0,0,0,0.04)] focus:ring-0 focus:shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
          )}
        >
          <SelectValue aria-label="Select language" />
        </SelectTrigger>
        <SelectContent className={cn(CLOUDY_DROPDOWN)} position="popper">
          {SUPPORTED_LOCALES.map((loc) => (
            <SelectItem key={loc} value={loc}>
              {LABELS[loc] ?? loc}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
