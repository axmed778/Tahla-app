"use client";

import { createContext, useContext, useMemo } from "react";
import { createT, type Locale, type TranslateFn } from "@/lib/i18n-config";

type I18nContextValue = {
  locale: Locale;
  t: TranslateFn;
  messages: Record<string, unknown>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function useTranslations(): TranslateFn {
  const ctx = useContext(I18nContext);
  if (!ctx) return (key: string) => key;
  return ctx.t;
}

export function useLocale(): Locale {
  const ctx = useContext(I18nContext);
  return ctx?.locale ?? "en";
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const t = useMemo(() => createT(messages), [messages]);
  const value = useMemo(() => ({ locale, messages, t }), [locale, messages, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
