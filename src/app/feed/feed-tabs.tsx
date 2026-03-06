"use client";

import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

type Group = { id: string; name: string };

export function FeedTabs({ currentGroupId, groups }: { currentGroupId: string | null; groups: Group[] }) {
  const t = useTranslations();
  return (
    <div className="flex gap-1 border-b mb-4">
      <Link
        href="/feed"
        className={cn(
          "px-3 py-2 text-sm font-medium rounded-t transition-colors",
          !currentGroupId
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {t("feed.generalFeed")}
      </Link>
      {groups.map((g) => (
        <Link
          key={g.id}
          href={`/feed?group=${encodeURIComponent(g.id)}`}
          className={cn(
            "px-3 py-2 text-sm font-medium rounded-t transition-colors",
            currentGroupId === g.id
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {g.name}
        </Link>
      ))}
    </div>
  );
}
