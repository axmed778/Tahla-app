/**
 * Normalize a clan (family-line) name for case-insensitive uniqueness.
 * Lowercases, trims, and collapses internal whitespace. Locale-aware lower-casing
 * keeps Azerbaijani/Turkish characters (İ, I, Ə, Ğ, …) consistent.
 */
export function normalizeClanName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("az");
}
