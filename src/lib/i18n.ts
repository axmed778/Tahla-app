import { cookies } from "next/headers";
import enMessages from "../../messages/en.json";
import azMessages from "../../messages/az.json";
import ruMessages from "../../messages/ru.json";
import type { Locale } from "./i18n-config";

export { SUPPORTED_LOCALES, type Locale } from "./i18n-config";
export const LOCALE_COOKIE = "NEXT_LOCALE";

import { SUPPORTED_LOCALES } from "./i18n-config";

const DEFAULT_LOCALE: Locale = "en";

const messages: Record<Locale, Record<string, unknown>> = {
  en: enMessages as Record<string, unknown>,
  az: azMessages as Record<string, unknown>,
  ru: ruMessages as Record<string, unknown>,
};

export function isValidLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isValidLocale(value) ? value : DEFAULT_LOCALE;
}

export function getMessages(locale: Locale): Record<string, unknown> {
  return messages[locale] ?? messages.en;
}

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export type { TranslateFn } from "./i18n-config";

export function getT(locale: Locale): (key: string) => string {
  const msg = getMessages(locale);
  return (key: string) => {
    const value = getNested(msg as Record<string, unknown>, key);
    return typeof value === "string" ? value : key;
  };
}
