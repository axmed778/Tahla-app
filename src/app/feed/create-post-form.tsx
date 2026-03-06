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
type Group = { id: string; name: string };

export function CreatePostForm({ people, groupId, groups }: { people: Person[]; groupId?: string | null; groups?: Group[] }) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("");
  const [relatedPersonIds, setRelatedPersonIds] = useState<string[]>([]);
  const [addPersonId, setAddPersonId] = useState<string>("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

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
    if (groupId) formData.set("groupId", groupId);
    photoFiles.forEach((f) => formData.append("photos", f));
    const result = await createPost(formData);
    setLoading(false);
    if (result?.error) setError(result.error);
    else {
      form.reset();
      setType("");
      setRelatedPersonIds([]);
      setPhotoFiles([]);
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
      {groups && groups.length > 0 && !groupId && (
        <div className="space-y-2">
          <Label>{t("feed.postToGroup")}</Label>
          <select name="groupId" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">{t("feed.generalFeed")}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}
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
        <Label>{t("feed.photos")}</Label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="text-sm"
          onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
        />
        {photoFiles.length > 0 && (
          <p className="text-xs text-muted-foreground">{photoFiles.length} {t("feed.photosSelected")}</p>
        )}
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
