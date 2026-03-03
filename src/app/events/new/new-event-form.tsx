"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEvent } from "@/actions/events";
import { useTranslations } from "@/components/i18n-provider";

type User = { id: string; firstName: string; lastName: string };

export function NewEventForm({ users }: { users: User[] }) {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleUser(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("userIds", [...selectedIds].join(","));
    const result = await createEvent(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">{t("events.eventName")}</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">{t("events.date")}</Label>
        <Input id="date" name="date" type="datetime-local" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="place">{t("events.place")}</Label>
        <Input id="place" name="place" />
      </div>
      <div className="space-y-2">
        <Label>{t("events.invitees")}</Label>
        <p className="text-xs text-muted-foreground">{t("events.inviteesVisible")}</p>
        <div className="rounded-md border p-3 max-h-48 overflow-y-auto space-y-2">
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.has(u.id)}
                onChange={() => toggleUser(u.id)}
              />
              <span className="text-sm">{u.firstName} {u.lastName}</span>
            </label>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit">{t("events.create")}</Button>
        <Link href="/events">
          <Button type="button" variant="outline">{t("form.cancel")}</Button>
        </Link>
      </div>
    </form>
  );
}
