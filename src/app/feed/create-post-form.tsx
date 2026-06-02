"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPost } from "@/actions/feed";
import { POST_TYPES, POST_TYPE_PILL_SELECTED, type PostType } from "@/lib/feed";
import { useTranslations } from "@/components/i18n-provider";
import { cn, formatPersonName } from "@/lib/utils";
import { ImagePlus, Upload, User, X } from "lucide-react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

type Person = { id: string; firstName: string; middleName: string | null; lastName: string };
type Group = { id: string; name: string };

function initials(first: string, last: string) {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return (a + b).toUpperCase() || "?";
}

export function CreatePostForm({
  people,
  groupId,
  groups,
  currentUser,
}: {
  people: Person[];
  groupId?: string | null;
  groups?: Group[];
  currentUser: { firstName: string; lastName: string };
}) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<PostType | "">("");
  const [relatedPersonIds, setRelatedPersonIds] = useState<string[]>([]);
  const [addPersonId, setAddPersonId] = useState<string>("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const availableToAdd = people.filter((p) => !relatedPersonIds.includes(p.id));

  const adjustTextareaHeight = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 320)}px`;
  }, []);

  function addFiles(files: File[]) {
    const valid = files.filter((f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_SIZE);
    setPhotoFiles((prev) => [...prev, ...valid]);
  }

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
    const formPhotos = formData.getAll("photos");
    if (photoFiles.length > 0 && formPhotos.length === 0) {
      photoFiles.forEach((f) => formData.append("photos", f));
    }
    const result = await createPost(formData);
    setLoading(false);
    if (result?.error) setError(result.error);
    else {
      form.reset();
      setType("");
      setRelatedPersonIds([]);
      setPhotoFiles([]);
      if (contentRef.current) {
        contentRef.current.style.height = "auto";
      }
    }
  }

  return (
    <Card className="overflow-hidden border shadow-md">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3 p-4 pb-2">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-2 ring-background"
              aria-label={`${currentUser.firstName} ${currentUser.lastName}`}
            >
              {initials(currentUser.firstName, currentUser.lastName)}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">{t("feed.type")}</Label>
                <input type="hidden" name="type" value={type} readOnly />
                <div className="flex flex-wrap gap-2">
                  {POST_TYPES.map((postType) => {
                    const selected = type === postType;
                    return (
                      <button
                        key={postType}
                        type="button"
                        onClick={() => setType(postType)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-all sm:text-sm",
                          selected
                            ? POST_TYPE_PILL_SELECTED[postType]
                            : "border-border bg-background text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        )}
                      >
                        {t(`feed.types.${postType}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {groups && groups.length > 0 && !groupId && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t("feed.postToGroup")}</Label>
                  <select
                    name="groupId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">{t("feed.generalFeed")}</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="relative">
                <textarea
                  ref={contentRef}
                  id="content"
                  name="content"
                  rows={2}
                  required
                  placeholder={t("feed.contentPlaceholder")}
                  className={cn(
                    "flex min-h-[44px] w-full resize-none rounded-md border-0 bg-transparent px-0 py-1 text-sm",
                    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0",
                    "ring-offset-background"
                  )}
                  onInput={adjustTextareaHeight}
                />
              </div>

              <div
                className={cn(
                  "relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/50"
                )}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  addFiles(Array.from(e.dataTransfer.files));
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  name="photos"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    addFiles(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }}
                />
                <div className="pointer-events-none flex flex-col items-center gap-1 px-4 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border">
                    {isDragging ? <Upload className="h-5 w-5 text-primary" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                  </span>
                  <span className="text-xs font-medium text-foreground">{t("feed.photos")}</span>
                  <span className="text-xs text-muted-foreground">
                    {photoFiles.length > 0
                      ? `${photoFiles.length} ${t("feed.photosSelected")}`
                      : t("feed.dropzoneHint")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">{t("feed.relatedPeople")}</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={addPersonId || ""}
                    onValueChange={(v) => {
                      if (v && v !== "__none__") addPerson(v);
                      setAddPersonId("");
                    }}
                  >
                    <SelectTrigger className="h-9 w-full max-w-[280px] rounded-full border-dashed">
                      <User className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <SelectValue placeholder={t("feed.addPerson")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableToAdd.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          {t("feed.noMorePeople")}
                        </SelectItem>
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
                  <div className="flex flex-wrap gap-2 pt-1">
                    {relatedPersonIds.map((id) => {
                      const p = people.find((x) => x.id === id);
                      return p ? (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                        >
                          {formatPersonName(p)}
                          <button
                            type="button"
                            onClick={() => removePerson(p.id)}
                            className="rounded-full p-0.5 hover:bg-primary/20"
                            aria-label={t("relationship.remove")}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
          <div className="border-t bg-muted/20 px-4 py-3">
            <Button type="submit" className="h-11 w-full font-semibold" disabled={loading || !type}>
              {t("feed.post")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
