"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePin } from "@/actions/auth";

export function ChangePinForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await changePin(formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    form.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="oldPin">Current PIN</Label>
        <Input id="oldPin" name="oldPin" type="password" inputMode="numeric" maxLength={8} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPin">New PIN (4–8 digits)</Label>
        <Input id="newPin" name="newPin" type="password" inputMode="numeric" maxLength={8} required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">PIN changed.</p>}
      <Button type="submit" disabled={loading}>Change PIN</Button>
    </form>
  );
}
