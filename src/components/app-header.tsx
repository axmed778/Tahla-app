"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/actions/auth";
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from "@/actions/notifications";
import type { NotificationItem } from "@/lib/notifications-types";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Menu, X, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type User = { id: string; firstName: string; lastName: string; isMaster: boolean; personId: string | null };

const NOTIFICATION_TYPE_KEYS: Record<string, string> = {
  FRIEND_REQUEST: "friendRequest",
  NEW_MESSAGE: "newMessage",
  EVENT_INVITE: "eventInvite",
  GROUP_APPLICATION_APPROVED: "groupApplicationApproved",
  GROUP_APPLICATION_REJECTED: "groupApplicationRejected",
  GROUP_APPLICATION_RECEIVED: "groupApplicationReceived",
  FEED_COMMENT: "feedComment",
  ADDED_AS_RELATIVE: "addedAsRelative",
};

function getNotificationMessage(
  t: (key: string) => string,
  n: NotificationItem
): string {
  const key = NOTIFICATION_TYPE_KEYS[n.type] ?? n.type;
  let msg = t(`notifications.${key}`);
  const actor = n.actorName ?? "Someone";
  if (msg.includes("{actor}")) msg = msg.replace("{actor}", actor);
  if (msg.includes("{eventName}")) msg = msg.replace("{eventName}", n.meta?.eventName ?? "");
  if (msg.includes("{groupName}")) msg = msg.replace("{groupName}", n.meta?.groupName ?? "");
  return msg;
}

function getNotificationHref(n: NotificationItem): string {
  switch (n.type) {
    case "FRIEND_REQUEST":
      return "/friends";
    case "NEW_MESSAGE":
      return n.meta?.conversationId ? `/messages/${n.meta.conversationId}` : "/messages";
    case "EVENT_INVITE":
      return n.meta?.eventId ? `/events/${n.meta.eventId}` : "/events";
    case "GROUP_APPLICATION_APPROVED":
    case "GROUP_APPLICATION_REJECTED":
    case "GROUP_APPLICATION_RECEIVED":
      return n.meta?.groupId ? `/groups/${n.meta.groupId}` : "/groups";
    case "FEED_COMMENT":
      return "/feed";
    case "ADDED_AS_RELATIVE":
      return n.meta?.personId ? `/people/${n.meta.personId}` : "/";
    default:
      return "/";
  }
}

function NotificationsCenter() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    getUnreadCount().then(setUnreadCount);
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getNotifications()
        .then((data) => {
          setList(data);
          setUnreadCount(data.filter((n) => !n.readAt).length);
        })
        .finally(() => setLoading(false));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current?.contains(e.target as Node) ||
        btnRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadFromList = list.filter((n) => !n.readAt).length;
  const displayUnread = open ? unreadFromList : unreadCount;

  async function handleItemClick(n: NotificationItem) {
    if (!n.readAt) {
      await markNotificationRead(n.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setList((prev) => prev.map((item) => (item.id === n.id ? { ...item, readAt: new Date() } : item)));
    }
    setOpen(false);
    router.push(getNotificationHref(n));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setList((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
  }

  return (
    <div className="relative">
      <Button
        ref={btnRef}
        type="button"
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 shrink-0"
        aria-label={t("common.notifications")}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-5 w-5" />
        {displayUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {displayUnread > 99 ? "99+" : displayUnread}
          </span>
        )}
      </Button>
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-1 w-80 max-h-[70vh] flex flex-col rounded-lg border bg-background shadow-lg"
          role="dialog"
          aria-label={t("common.notifications")}
        >
          <div className="flex items-center justify-between border-b p-3">
            <p className="text-sm font-medium text-foreground">{t("common.notifications")}</p>
            {displayUnread > 0 && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={handleMarkAllRead}
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>
          <div className="overflow-y-auto p-2">
            {loading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">…</p>
            ) : list.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">{t("common.notificationsEmpty")}</p>
            ) : (
              <ul className="space-y-0.5">
                {list.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                        !n.readAt && "bg-muted/70 font-medium"
                      )}
                      onClick={() => handleItemClick(n)}
                    >
                      {getNotificationMessage(t, n)}
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
            {user && (
              <>
                <NotificationsCenter />
                {user.personId ? (
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
                )}
              </>
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
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r bg-background shadow-lg transition-transform duration-200 ease-out",
          menuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label={t("common.mainNav")}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
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
        <div className="mt-auto border-t p-3">
          <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">{t("common.language")}</p>
          <div className="px-2">
            <LanguageSwitcher />
          </div>
        </div>
      </aside>
    </>
  );
}
