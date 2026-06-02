// Client-safe i18n constants (no next/headers). Use this from "use client" components.
export const SUPPORTED_LOCALES = ["en", "az", "ru"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type TranslateFn = (key: string) => string;

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Build translate function from messages (client-safe, no server deps). */
export function createT(messages: Record<string, unknown>): TranslateFn {
  return (key: string) => {
    const value = getNested(messages, key);
    return typeof value === "string" ? value : key;
  };
}
