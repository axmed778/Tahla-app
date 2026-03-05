"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Person, PersonPhone, PersonTag, Tag } from "@prisma/client";
import Link from "next/link";
import { formatPersonName } from "@/lib/utils";

type PersonWithRelations = Person & {
  phones: PersonPhone[];
  tags: (PersonTag & { tag: Tag })[];
};

type Props = {
  initialPeople: PersonWithRelations[];
  total: number;
  totalPages: number;
  cities: string[];
  currentPage: number;
  searchParams: { q?: string; city?: string; maritalStatus?: string; gender?: string; sort?: string; page?: string };
};

const PAGE_SIZE = 20;

export function DirectoryClient({
  initialPeople,
  total,
  totalPages,
  cities,
  currentPage,
  searchParams,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Search & filters</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" action="/" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="q">Search</Label>
                <Input
                  id="q"
                  name="q"
                  placeholder="Name, phone, city, workplace, tags..."
                  defaultValue={searchParams.q}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <select
                  id="city"
                  name="city"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue={searchParams.city ?? ""}
                >
                  <option value="">All cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maritalStatus">Marital status</Label>
                <select
                  id="maritalStatus"
                  name="maritalStatus"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue={searchParams.maritalStatus ?? ""}
                >
                  <option value="">All</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  name="gender"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue={searchParams.gender ?? ""}
                >
                  <option value="">All</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="sort">Sort</Label>
                <select
                  id="sort"
                  name="sort"
                  className="flex h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue={searchParams.sort ?? "updatedAt"}
                >
                  <option value="updatedAt">Last updated</option>
                  <option value="name">A–Z</option>
                </select>
              </div>
              <Button type="submit">Apply</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Relatives ({total})</h2>
          <Button asChild>
            <Link href="/people/new">Add person</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {initialPeople.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No people found.</p>
          ) : (
            <>
              <ul className="divide-y">
                {initialPeople.map((person) => (
                  <li key={person.id}>
                    <Link
                      href={`/people/${person.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 px-1 hover:bg-muted/50 rounded-md -mx-1"
                    >
                      <span className="font-medium">
                        {formatPersonName(person)}
                        {person.city && (
                          <span className="text-muted-foreground font-normal"> · {person.city}</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {person.phones[0] && <span>{person.phones[0].number}</span>}
                        {person.tags.length > 0 && (
                          <span>{person.tags.map((t) => t.tag.name).join(", ")}</span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => {
                        const next = new URLSearchParams(sp?.toString() ?? "");
                        next.set("page", String(currentPage - 1));
                        router.push(`/?${next.toString()}`);
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => {
                        const next = new URLSearchParams(sp?.toString() ?? "");
                        next.set("page", String(currentPage + 1));
                        router.push(`/?${next.toString()}`);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
