"use client";

import { acceptFriendRequest, declineFriendRequest } from "@/actions/friends";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";

type Item = { id: string; user: { id: string; firstName: string; lastName: string } };

export function IncomingRequests({ requests }: { requests: Item[] }) {
  const t = useTranslations();
  if (requests.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="font-medium mb-3">{t("friends.incomingRequests")}</h3>
      <p className="text-sm text-muted-foreground mb-3">{t("friends.incomingRequestsHint")}</p>
      <ul className="space-y-2">
        {requests.map(({ id, user }) => (
          <li
            key={id}
            className="flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/30"
          >
            <span>
              {user.firstName} {user.lastName}
            </span>
            <div className="flex gap-2">
              <form action={async (fd) => { await declineFriendRequest(fd); }}>
                <input type="hidden" name="requestId" value={id} />
                <Button type="submit" variant="ghost" size="sm">
                  {t("friends.decline")}
                </Button>
              </form>
              <form action={async (fd) => { await acceptFriendRequest(fd); }}>
                <input type="hidden" name="requestId" value={id} />
                <Button type="submit" size="sm">
                  {t("friends.accept")}
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
