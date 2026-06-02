"use client";

import { useRouter } from "next/navigation";
import { getOrCreateConversation } from "@/actions/messages";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "@/components/i18n-provider";
import { useState } from "react";

type User = { id: string; firstName: string; lastName: string };

export function NewConversationForm({ users }: { users: User[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setError(null);
    setLoading(true);
    const result = await getOrCreateConversation(userId);
    setLoading(false);
    if (result?.error) setError(result.error);
    else if (result?.conversationId) router.push(`/messages/${result.conversationId}`);
  }

  return (
    <form onSubmit={handleStart} className="flex gap-2 items-end">
      <div className="flex-1 space-y-1">
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger>
            <SelectValue placeholder={t("messages.startWith")} />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={!userId || loading}>{t("messages.start")}</Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
