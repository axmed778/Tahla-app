"use client";

import Link from "next/link";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

type User = { id: string; firstName: string; lastName: string; isMaster: boolean };

export function AppHeader({ user }: { user: User | null }) {
  const t = useTranslations();
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <h1 className="text-lg font-semibold">{t("appName")}</h1>
        <nav className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">{t("nav.directory")}</Link>
          <Link href="/feed" className="text-sm font-medium text-muted-foreground hover:text-foreground">{t("nav.feed")}</Link>
          <Link href="/events" className="text-sm font-medium text-muted-foreground hover:text-foreground">{t("nav.events")}</Link>
          <Link href="/tree" className="text-sm font-medium text-muted-foreground hover:text-foreground">{t("nav.familyTree")}</Link>
          <Link href="/friends" className="text-sm font-medium text-muted-foreground hover:text-foreground">{t("nav.friends")}</Link>
          <Link href="/people/new" className="text-sm font-medium text-muted-foreground hover:text-foreground">{t("nav.addPerson")}</Link>
          <Link href="/settings" className="text-sm font-medium text-muted-foreground hover:text-foreground">{t("nav.settings")}</Link>
          <LanguageSwitcher />
          {user && (
            <span className="text-sm text-muted-foreground">
              {user.firstName} {user.lastName}
              {user.isMaster && ` (${t("nav.master")})`}
            </span>
          )}
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">{t("nav.signOut")}</Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
