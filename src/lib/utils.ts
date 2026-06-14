import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Locale } from "./i18n-config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAge(birthDate: Date | null, deathDate: Date | null): number | null {
  if (!birthDate) return null;
  const end = deathDate ?? new Date();
  let age = end.getFullYear() - birthDate.getFullYear();
  const m = end.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birthDate.getDate())) age--;
  return age;
}

export function formatDate(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Patronymic markers already present in stored data (Latin/Cyrillic, male/female).
 * If the middle name already ends with one we don't append another (avoids "Məmməd oğlu oğlu").
 */
const PATRONYMIC_MARKER_RE = /(?:^|\s)(o[gğ]lu|q[ıi]z[ıi]|оглы|оглу|гызы|кызы)\.?$/i;

/**
 * Azerbaijani "son of / daughter of" marker in the active UI language.
 * Latin (oğlu/qızı) for az/en, Cyrillic (оглы/кызы) for ru. Empty for unknown gender.
 */
function patronymicSuffix(gender: string | null | undefined, locale: Locale): string {
  if (gender === "MALE") return locale === "ru" ? "оглы" : "oğlu";
  if (gender === "FEMALE") return locale === "ru" ? "кызы" : "qızı";
  return "";
}

/**
 * Format full name with optional patronymic (отчество): "FirstName MiddleName[ oğlu/qızı] LastName".
 * When `gender` is known the patronymic gets a "son/daughter of" marker in the UI language
 * (unless the stored middle name already includes one).
 */
export function formatPersonName(
  p: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    gender?: string | null;
  },
  locale: Locale = "en"
): string {
  const mid = p.middleName?.trim();
  if (!mid) return `${p.firstName} ${p.lastName}`;
  const suffix = PATRONYMIC_MARKER_RE.test(mid) ? "" : patronymicSuffix(p.gender, locale);
  const patronymic = suffix ? `${mid} ${suffix}` : mid;
  return `${p.firstName} ${patronymic} ${p.lastName}`;
}
