"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendFriendRequest } from "@/actions/friends";
import { useTranslations } from "@/components/i18n-provider";

type User = { id: string; firstName: string; lastName: string };

export function AddFriendForm({ users }: { users: User[] }) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("friends.noUsersToAdd")}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {users.map((u) => (
        <li
          key={u.id}
          className="flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/30"
        >
          <span>
            {u.firstName} {u.lastName}
          </span>
          <form action={async (formData) => { await sendFriendRequest(formData); }}>
            <input type="hidden" name="userId" value={u.id} />
            <Button type="submit" size="sm" disabled={loading}>
              {t("friends.sendRequest")}
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}
