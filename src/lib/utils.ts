import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
