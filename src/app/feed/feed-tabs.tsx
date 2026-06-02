"use client";

import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

type Group = { id: string; name: string };

export function FeedTabs({ currentGroupId, groups }: { currentGroupId: string | null; groups: Group[] }) {
  const t = useTranslations();
  const tabClass = (active: boolean) =>
    cn(
      "inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <Link href="/feed" className={tabClass(!currentGroupId)}>
        {t("feed.generalFeed")}
      </Link>
      {groups.map((g) => (
        <Link key={g.id} href={`/feed?group=${encodeURIComponent(g.id)}`} className={tabClass(currentGroupId === g.id)}>
          {g.name}
        </Link>
      ))}
    </div>
  );
}
