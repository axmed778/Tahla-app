"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createRelationshipRequest, type RelationshipRequestType } from "@/actions/relationship-requests";

const OPTIONS: { value: RelationshipRequestType; label: string }[] = [
  { value: "PARENT", label: "Parent" },
  { value: "CHILD", label: "Child" },
  { value: "SIBLING", label: "Sibling" },
  { value: "SPOUSE", label: "Spouse" },
  { value: "PARTNER", label: "Partner" },
  { value: "OTHER", label: "Other" },
];

export function AddRelativeRequestButton({ toUserId }: { toUserId: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<RelationshipRequestType>("SIBLING");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setLoading(true);
    setError(null);
    const res = await createRelationshipRequest({
      toUserId,
      type,
      label: type === "OTHER" ? label : type === "PARTNER" && label.trim() ? label : label,
    });
    if ((res as { error?: string })?.error) {
      setError((res as { error: string }).error);
      setLoading(false);
      return;
    }
    setLoading(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Add as relative</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add as relative</DialogTitle>
          <DialogDescription>What is this person to you?</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Select value={type} onValueChange={(v) => setType(v as RelationshipRequestType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(type === "OTHER" || type === "PARTNER") && (
            <div className="space-y-2">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={type === "OTHER" ? "Optional label (e.g. cousin)" : "Optional label (e.g. fiancé)"}
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="button" disabled={loading} onClick={handleSend}>
            {loading ? "Sending..." : "Send request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

