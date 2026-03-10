"use client";

import { removeFriend } from "@/actions/friends";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";

type Friend = { id: string; firstName: string; lastName: string };

export function FriendsList({ friends }: { friends: Friend[] }) {
  const t = useTranslations();
  if (friends.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("friends.noFriends")}</p>;
  }

  return (
    <ul className="space-y-2">
      {friends.map((friend) => (
        <li
          key={friend.id}
          className="flex items-center justify-between rounded-lg border px-4 py-3 bg-background"
        >
          <span>
            {friend.firstName} {friend.lastName}
          </span>
          <form action={async (fd) => { await removeFriend(fd); }}>
            <input type="hidden" name="userId" value={friend.id} />
            <Button type="submit" variant="ghost" size="sm">
              {t("friends.remove")}
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}
