"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPersonPhoto, removePersonPhoto } from "@/actions/people";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useTranslations } from "@/components/i18n-provider";
import { ImageLightbox } from "@/components/image-lightbox";
import { Camera, Trash2, Loader2 } from "lucide-react";

export function ProfilePhotoSection({ personId, photoUrl }: { personId: string; photoUrl: string | null }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("personId", personId);
      formData.set("photo", file);
      const result = await uploadPersonPhoto(formData);
      if (result?.error) setError(result.error);
      else router.refresh();
    } finally {
      setPending(false);
      e.target.value = "";
    }
  }

  async function handleRemove() {
    setError(null);
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("personId", personId);
      const result = await removePersonPhoto(fd);
      if (result?.error) setError(result.error);
      else router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-medium">{t("profile.photo")}</h3>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-start gap-4">
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-muted shrink-0">
          {photoUrl ? (
            <ImageLightbox src={photoUrl} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={pending}
                onChange={handleUpload}
              />
              <Button type="button" variant="outline" size="sm" asChild>
                <span>
                  {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  <span className="ml-2">{photoUrl ? t("profile.changePhoto") : t("profile.uploadPhoto")}</span>
                </span>
              </Button>
            </label>
            {photoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={handleRemove}
              >
                <Trash2 className="w-4 h-4" />
                <span className="ml-2">{t("profile.removePhoto")}</span>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("profile.photoHint")}</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
