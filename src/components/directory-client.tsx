"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/components/i18n-provider";
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
  const t = useTranslations();
  const pageOfText = t("directory.pageOf")
    .replace("{current}", String(currentPage))
    .replace("{total}", String(totalPages));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{t("directory.searchFilters")}</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" action="/" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="q">{t("directory.search")}</Label>
                <Input
                  id="q"
                  name="q"
                  placeholder={t("directory.searchPlaceholder")}
                  defaultValue={searchParams.q}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t("directory.city")}</Label>
                <select
                  id="city"
                  name="city"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue={searchParams.city ?? ""}
                >
                  <option value="">{t("directory.allCities")}</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maritalStatus">{t("directory.maritalStatus")}</Label>
                <select
                  id="maritalStatus"
                  name="maritalStatus"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue={searchParams.maritalStatus ?? ""}
                >
                  <option value="">{t("common.all")}</option>
                  <option value="SINGLE">{t("form.single")}</option>
                  <option value="MARRIED">{t("form.married")}</option>
                  <option value="DIVORCED">{t("form.divorced")}</option>
                  <option value="WIDOWED">{t("form.widowed")}</option>
                  <option value="OTHER">{t("form.other")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">{t("directory.gender")}</Label>
                <select
                  id="gender"
                  name="gender"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue={searchParams.gender ?? ""}
                >
                  <option value="">{t("common.all")}</option>
                  <option value="MALE">{t("form.male")}</option>
                  <option value="FEMALE">{t("form.female")}</option>
                  <option value="OTHER">{t("form.other")}</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="sort">{t("directory.sort")}</Label>
                <select
                  id="sort"
                  name="sort"
                  className="flex h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue={searchParams.sort ?? "updatedAt"}
                >
                  <option value="updatedAt">{t("directory.lastUpdated")}</option>
                  <option value="name">{t("directory.nameAZ")}</option>
                </select>
              </div>
              <Button type="submit">{t("common.apply")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">{t("directory.relatives")} ({total})</h2>
          <Button asChild>
            <Link href="/people/new">{t("nav.addPerson")}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {initialPeople.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">{t("directory.noPeopleFound")}</p>
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
                          <span>{person.tags.map((tag) => tag.tag.name).join(", ")}</span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
                  <p className="text-sm text-muted-foreground">{pageOfText}</p>
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
                      {t("common.previous")}
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
                      {t("common.next")}
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
