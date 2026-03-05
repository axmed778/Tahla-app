"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addRelationship } from "@/actions/relationships";
import { formatPersonName } from "@/lib/utils";
import { useTranslations } from "@/components/i18n-provider";
import type { Person } from "@prisma/client";

type Props = { fromPersonId: string; otherPeople: Person[] };

/** Users can add only child, spouse, sibling, or other — not parent. */
const REL_TYPES = ["CHILD", "SIBLING", "SPOUSE", "OTHER"] as const;

export function AddRelationshipForm({ fromPersonId, otherPeople }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toPersonId, setToPersonId] = useState("");
  const [type, setType] = useState<"CHILD" | "SIBLING" | "SPOUSE" | "OTHER">("CHILD");
  const [label, setLabel] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await addRelationship(fromPersonId, { toPersonId, type, label: label.trim() || undefined });
    if (result?.error) {
      const msg = typeof result.error === "object" ? Object.values(result.error).flat()[0] : result.error;
      setError(msg ?? "Error");
      setLoading(false);
      return;
    }
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">{t("addRelationship.title")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addRelationship.title")}</DialogTitle>
          <DialogDescription>{t("addRelationship.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("addRelationship.person")}</Label>
            <Select value={toPersonId} onValueChange={setToPersonId} required>
              <SelectTrigger>
                <SelectValue placeholder={t("addRelationship.selectPerson")} />
              </SelectTrigger>
              <SelectContent>
                {otherPeople.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {formatPersonName(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("addRelationship.type")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue placeholder={t("addRelationship.type")} />
              </SelectTrigger>
              <SelectContent>
                {REL_TYPES.map((r) => (
                  <SelectItem key={r} value={r}>{t(`addRelationship.${r.toLowerCase()}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("addRelationship.labelOptional")}</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("addRelationship.labelPlaceholder")} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>{t("addRelationship.add")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
