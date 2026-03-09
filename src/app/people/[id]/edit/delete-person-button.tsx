"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deletePerson } from "@/actions/people";

export function DeletePersonButton({ personId }: { personId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setLoading(true);
    const result = await deletePerson(personId);
    setLoading(false);
    if (result?.error) setError(result.error);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete person
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete person</DialogTitle>
          <DialogDescription>
            This will permanently delete this person and all their contact info, tags, and relationships. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {error && <p className="text-sm text-destructive w-full sm:order-last sm:basis-full">{error}</p>}
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
