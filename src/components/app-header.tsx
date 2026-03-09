"use client";

import { useState } from "react";
import Link from "next/link";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

type User = { id: string; firstName: string; lastName: string; isMaster: boolean; personId: string | null };

const NAV_LINKS = [
  { href: "/", key: "nav.directory" },
  { href: "/feed", key: "nav.feed" },
  { href: "/groups", key: "nav.groups" },
  { href: "/events", key: "nav.events" },
  { href: "/tree", key: "nav.familyTree" },
  { href: "/tree/overview", key: "nav.treeOverview", masterOnly: true },
  { href: "/friends", key: "nav.friends" },
  { href: "/messages", key: "nav.messages" },
  { href: "/people/new", key: "nav.addPerson" },
  { href: "/settings", key: "nav.settings" },
] as const;

export function AppHeader({ user }: { user: User | null }) {
  const t = useTranslations();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center gap-4 px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label={t("common.openMenu")}
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <h1 className="min-w-0 flex-1 text-center text-lg font-semibold">
            <Link href="/feed" className="hover:underline">
              {t("appName")}
            </Link>
          </h1>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            {user && (
              user.personId ? (
                <Link
                  href={`/people/${user.personId}`}
                  className="max-w-[120px] truncate text-sm font-medium text-foreground hover:underline sm:max-w-none"
                >
                  {user.firstName} {user.lastName}
                  {user.isMaster && ` (${t("nav.master")})`}
                </Link>
              ) : (
                <Link
                  href="/profile/complete"
                  className="max-w-[120px] truncate text-sm font-medium text-foreground hover:underline sm:max-w-none"
                >
                  {user.firstName} {user.lastName}
                  {user.isMaster && ` (${t("nav.master")})`}
                </Link>
              )
            )}
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                {t("nav.signOut")}
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity",
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden
        onClick={() => setMenuOpen(false)}
      />

      {/* Slide-out menu */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 border-r bg-background shadow-lg transition-transform duration-200 ease-out",
          menuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label={t("common.mainNav")}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <span className="font-semibold">{t("common.menu")}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("common.closeMenu")}
            onClick={() => setMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex flex-col gap-0 p-2">
          {NAV_LINKS.filter((link) => !("masterOnly" in link && link.masterOnly) || user?.isMaster).map(({ href, key }) => (
            <Link
              key={key}
              href={href}
              className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              {t(key)}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
