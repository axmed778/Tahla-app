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

type Person = { id: string; firstName: string; lastName: string };

export function CreatePostForm({ people }: { people: Person[] }) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("");
  const [relatedPersonId, setRelatedPersonId] = useState<string>("__none__");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("type", type);
    formData.set("relatedPersonId", relatedPersonId === "__none__" ? "" : relatedPersonId);
    const result = await createPost(formData);
    setLoading(false);
    if (result?.error) setError(result.error);
    else {
      form.reset();
      setType("");
      setRelatedPersonId("__none__");
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
        <Label htmlFor="relatedPersonId">{t("feed.relatedPerson")}</Label>
        <Select name="relatedPersonId" value={relatedPersonId} onValueChange={setRelatedPersonId}>
          <SelectTrigger>
            <SelectValue placeholder={t("feed.none")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t("feed.none")}</SelectItem>
            {people.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>{t("feed.post")}</Button>
    </form>
  );
}
