"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALE_COOKIE, isValidLocale } from "@/lib/i18n";

export async function setLocale(formData: FormData) {
  const locale = (formData.get("locale") ?? "").toString();
  if (!isValidLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  redirect("/");
}
