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
import type { Person } from "@prisma/client";

type Props = { fromPersonId: string; otherPeople: Person[] };

const REL_TYPES = [
  { value: "PARENT", label: "Parent" },
  { value: "CHILD", label: "Child" },
  { value: "SIBLING", label: "Sibling" },
  { value: "SPOUSE", label: "Spouse" },
  { value: "OTHER", label: "Other" },
] as const;

export function AddRelationshipForm({ fromPersonId, otherPeople }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toPersonId, setToPersonId] = useState("");
  const [type, setType] = useState<"PARENT" | "CHILD" | "SIBLING" | "SPOUSE" | "OTHER">("OTHER");
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
        <Button variant="outline" size="sm">Add relationship</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add relationship</DialogTitle>
          <DialogDescription>Link this person to another. Relationship will be stored in both directions where applicable.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Person</Label>
            <Select value={toPersonId} onValueChange={setToPersonId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                {otherPeople.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {REL_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Label (optional, e.g. uncle, aunt)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. uncle" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>Add</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
