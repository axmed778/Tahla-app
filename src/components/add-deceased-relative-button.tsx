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
import { addDeceasedRelative } from "@/actions/people";
import { useTranslations } from "@/components/i18n-provider";

type Relationship = "PARENT" | "CHILD" | "SIBLING" | "SPOUSE";
type Gender = "MALE" | "FEMALE" | "OTHER";

type Props = {
  /** The existing person the deceased relative will be linked to. */
  personId: string;
  /** Pre-filled as the new person's last name (relatives usually share a surname). */
  defaultLastName: string;
};

const RELATIONSHIPS: Relationship[] = ["PARENT", "CHILD", "SIBLING", "SPOUSE"];

export function AddDeceasedRelativeButton({ personId, defaultLastName }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [relationship, setRelationship] = useState<Relationship>("PARENT");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState(defaultLastName);
  const [gender, setGender] = useState<Gender>("MALE");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await addDeceasedRelative(personId, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      birthDate: birthDate || undefined,
      deathDate: deathDate || undefined,
      relationship,
    });
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setOpen(false);
    setLoading(false);
    setFirstName("");
    setBirthDate("");
    setDeathDate("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t("deceased.add")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deceased.title")}</DialogTitle>
          <DialogDescription>{t("deceased.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("deceased.relationship")}</Label>
            <Select value={relationship} onValueChange={(v) => setRelationship(v as Relationship)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`addRelationship.${r.toLowerCase()}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deceasedFirstName">{t("form.firstName")}</Label>
              <Input
                id="deceasedFirstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deceasedLastName">{t("form.lastName")}</Label>
              <Input
                id="deceasedLastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("form.gender")}</Label>
            <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">{t("form.male")}</SelectItem>
                <SelectItem value="FEMALE">{t("form.female")}</SelectItem>
                <SelectItem value="OTHER">{t("form.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deceasedBirthDate">{t("form.birthDate")}</Label>
              <Input
                id="deceasedBirthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deceasedDeathDate">{t("form.deathDate")}</Label>
              <Input
                id="deceasedDeathDate"
                type="date"
                value={deathDate}
                onChange={(e) => setDeathDate(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>
            {t("deceased.save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
