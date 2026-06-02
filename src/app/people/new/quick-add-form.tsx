"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { quickAddPerson } from "@/actions/people";
import Link from "next/link";

type Tag = { id: string; name: string };

export function QuickAddForm({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const [error, setError] = useState<Record<string, string[] | undefined> | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await quickAddPerson(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="font-medium">Quick add</h3>
          <p className="text-sm text-muted-foreground">Minimal: name + phone, optional city.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error?._form?.[0] && <p className="text-sm text-destructive">{error._form[0]}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" name="firstName" required />
                {error?.firstName?.[0] && <p className="text-sm text-destructive">{error.firstName[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" required />
                {error?.lastName?.[0] && <p className="text-sm text-destructive">{error.lastName[0]}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City (optional)</Label>
              <Input id="city" name="city" />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Add person</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Need to add more fields (emails, occupation, marital status, etc.)? After adding, open the
            person and click Edit, or use the full form below.
          </p>
          <Button variant="link" className="px-0 mt-2 h-auto" asChild>
            <Link href="/people/new/full">Open full add form</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
