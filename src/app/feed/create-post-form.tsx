"use client";

import { useState } from "react";
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
import { createPost } from "@/actions/feed";
import { POST_TYPES } from "@/lib/feed";
import { useTranslations } from "@/components/i18n-provider";
import { formatPersonName } from "@/lib/utils";
import { X } from "lucide-react";

type Person = { id: string; firstName: string; middleName: string | null; lastName: string };

export function CreatePostForm({ people }: { people: Person[] }) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("");
  const [relatedPersonIds, setRelatedPersonIds] = useState<string[]>([]);
  const [addPersonId, setAddPersonId] = useState<string>("");

  const availableToAdd = people.filter((p) => !relatedPersonIds.includes(p.id));

  function addPerson(id: string) {
    if (id && !relatedPersonIds.includes(id)) setRelatedPersonIds((prev) => [...prev, id]);
    setAddPersonId("");
  }

  function removePerson(id: string) {
    setRelatedPersonIds((prev) => prev.filter((x) => x !== id));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("type", type);
    formData.set("relatedPersonIds", relatedPersonIds.join(","));
    const result = await createPost(formData);
    setLoading(false);
    if (result?.error) setError(result.error);
    else {
      form.reset();
      setType("");
      setRelatedPersonIds([]);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-lg border bg-muted/30">
      <div className="space-y-2">
        <Label>{t("feed.type")}</Label>
        <Select name="type" required value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue placeholder={t("feed.type")} />
          </SelectTrigger>
          <SelectContent>
            {POST_TYPES.map((postType) => (
              <SelectItem key={postType} value={postType}>
                {t(`feed.types.${postType}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">{t("feed.content")}</Label>
        <Input
          id="content"
          name="content"
          placeholder={t("feed.contentPlaceholder")}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>{t("feed.relatedPeople")}</Label>
        <div className="flex flex-wrap gap-2 items-center">
          <Select
            value={addPersonId || ""}
            onValueChange={(v) => {
              if (v) addPerson(v);
              setAddPersonId("");
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("feed.addPerson")} />
            </SelectTrigger>
            <SelectContent>
              {availableToAdd.length === 0 ? (
                <SelectItem value="__none__" disabled>{t("feed.noMorePeople")}</SelectItem>
              ) : (
                availableToAdd.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {formatPersonName(p)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        {relatedPersonIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {relatedPersonIds.map((id) => {
              const p = people.find((x) => x.id === id);
              return p ? (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-sm"
                >
                  {formatPersonName(p)}
                  <button
                    type="button"
                    onClick={() => removePerson(p.id)}
                    className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                    aria-label={t("relationship.remove")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>{t("feed.post")}</Button>
    </form>
  );
}
