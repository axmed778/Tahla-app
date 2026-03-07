"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEvent } from "@/actions/events";
import { useTranslations } from "@/components/i18n-provider";
import { Search } from "lucide-react";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  person?: { city: string | null; birthDate: Date | string | null; gender: string } | null;
};

const SORT_KEYS = ["name", "city", "age", "gender"] as const;
type SortKey = (typeof SORT_KEYS)[number];

function getAge(birthDate: Date | string | null | undefined): number | null {
  if (birthDate == null) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function NewEventForm({ users }: { users: User[] }) {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = users;
    if (q) {
      list = list.filter(
        (u) =>
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case "name":
          const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
          const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
          return nameA.localeCompare(nameB);
        case "city": {
          const cityA = (a.person?.city ?? "").toLowerCase();
          const cityB = (b.person?.city ?? "").toLowerCase();
          return cityA.localeCompare(cityB);
        }
        case "age": {
          const ageA = getAge(a.person?.birthDate) ?? -1;
          const ageB = getAge(b.person?.birthDate) ?? -1;
          return ageA - ageB;
        }
        case "gender": {
          const gA = (a.person?.gender ?? "").toLowerCase();
          const gB = (b.person?.gender ?? "").toLowerCase();
          return gA.localeCompare(gB);
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [users, search, sortBy]);

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
        <Label>{t("events.photo")}</Label>
        <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="text-sm mr-3" />
      </div>
      <div className="space-y-2">
        <Label>{t("events.invitees")}</Label>
        <p className="text-xs text-muted-foreground">{t("events.inviteesVisible")}</p>
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("events.inviteesSearch")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label={t("events.inviteesSearch")}
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("events.sortBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{t("events.sortByName")}</SelectItem>
              <SelectItem value="city">{t("events.sortByCity")}</SelectItem>
              <SelectItem value="age">{t("events.sortByAge")}</SelectItem>
              <SelectItem value="gender">{t("events.sortByGender")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border p-3 max-h-48 overflow-y-auto space-y-2">
          {filteredAndSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              {search.trim() ? t("events.inviteesNoResults") : t("events.inviteesEmpty")}
            </p>
          ) : (
            filteredAndSorted.map((u) => (
              <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.has(u.id)}
                  onChange={() => toggleUser(u.id)}
                />
                <span className="text-sm">
                  {u.firstName} {u.lastName}
                  {(u.person?.city ?? u.person?.gender) && (
                    <span className="text-muted-foreground ml-1">
                      {[u.person?.city, u.person?.gender].filter(Boolean).join(" · ")}
                      {u.person?.birthDate != null && u.person?.birthDate !== "" && (
                        <> · {getAge(u.person.birthDate) ?? "—"} {t("profile.years")}</>
                      )}
                    </span>
                  )}
                </span>
              </label>
            ))
          )}
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
