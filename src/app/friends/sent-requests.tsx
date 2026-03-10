"use client";

import { cancelFriendRequest } from "@/actions/friends";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";

type Item = { id: string; user: { id: string; firstName: string; lastName: string } };

export function SentRequests({ requests }: { requests: Item[] }) {
  const t = useTranslations();
  if (requests.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="font-medium mb-3">{t("friends.sentRequests")}</h3>
      <ul className="space-y-2">
        {requests.map(({ id, user }) => (
          <li
            key={id}
            className="flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/20"
          >
            <span>
              {user.firstName} {user.lastName}
            </span>
            <form action={async (fd) => { await cancelFriendRequest(fd); }}>
              <input type="hidden" name="requestId" value={id} />
              <Button type="submit" variant="ghost" size="sm">
                {t("friends.cancelRequest")}
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
