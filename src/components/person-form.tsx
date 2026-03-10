"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { personFormSchema, type PersonFormData } from "@/lib/validations";
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
import { createPerson, createPersonForCurrentUser, updatePerson } from "@/actions/people";
import { useTranslations } from "@/components/i18n-provider";
import { COUNTRIES, getCities } from "@/lib/locations";
import type { Tag } from "@prisma/client";

type Props = {
  personId?: string;
  initial: PersonFormData;
  tags: Tag[];
  /** When true and no personId, creates person linked to current user (profile/complete). */
  linkToCurrentUser?: boolean;
};

export function PersonForm({ personId, initial, tags, linkToCurrentUser }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PersonFormData>({
    resolver: zodResolver(personFormSchema),
    defaultValues: initial,
  });

  const phones = watch("phones");
  const emails = watch("emails");

  async function onSubmit(data: PersonFormData) {
    setServerError(null);
    const cleaned = {
      ...data,
      phones: data.phones.filter((p) => p.number.trim()),
      emails: data.emails.filter((e) => e.email.trim()),
    };
    if (personId) {
      const result = await updatePerson(personId, cleaned);
      if (result?.error) {
        const first = Object.values(result.error).flat()[0];
        setServerError(first ?? "Error");
        return;
      }
      router.push(`/people/${personId}`);
    } else if (linkToCurrentUser) {
      const result = await createPersonForCurrentUser(cleaned);
      if (result?.error) {
        const first = Object.values(result.error).flat()[0];
        setServerError(first ?? "Error");
        return;
      }
      // createPersonForCurrentUser redirects on success
    } else {
      await createPerson(cleaned);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      {personId && (
        <Card>
          <CardHeader><h3 className="font-medium">{t("profile.visibility")}</h3></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>{t("profile.visibilityLabel")}</Label>
              <Select
                value={watch("profileVisibility") ?? "ALL"}
                onValueChange={(v) => setValue("profileVisibility", v as "ALL" | "FRIENDS" | "FIRST_GEN")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("profile.visibilityAll")}</SelectItem>
                  <SelectItem value="FRIENDS">{t("profile.visibilityFriends")}</SelectItem>
                  <SelectItem value="FIRST_GEN">{t("profile.visibilityFirstGen")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("profile.visibilityHint")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><h3 className="font-medium">{t("form.identity")}</h3></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("form.firstName")}</Label>
              <Input {...register("firstName")} />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t("form.middleName")}</Label>
              <Input {...register("middleName")} />
            </div>
            <div className="space-y-2">
              <Label>{t("form.lastName")}</Label>
              <Input {...register("lastName")} />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("form.gender")}</Label>
              <Select value={watch("gender")} onValueChange={(v) => setValue("gender", v as "MALE" | "FEMALE" | "OTHER")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">{t("form.male")}</SelectItem>
                  <SelectItem value="FEMALE">{t("form.female")}</SelectItem>
                  <SelectItem value="OTHER">{t("form.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("form.maritalStatus")}</Label>
              <Select value={watch("maritalStatus")} onValueChange={(v) => setValue("maritalStatus", v as "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | "OTHER")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE">{t("form.single")}</SelectItem>
                  <SelectItem value="MARRIED">{t("form.married")}</SelectItem>
                  <SelectItem value="DIVORCED">{t("form.divorced")}</SelectItem>
                  <SelectItem value="WIDOWED">{t("form.widowed")}</SelectItem>
                  <SelectItem value="OTHER">{t("form.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("form.birthDate")}</Label>
              <Input type="date" {...register("birthDate")} />
            </div>
            <div className="space-y-2">
              <Label>{t("form.deathDate")}</Label>
              <Input type="date" {...register("deathDate")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h3 className="font-medium">{t("form.contact")}</h3></CardHeader>
        <CardContent className="space-y-4">
          {phones.map((_, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input placeholder={t("form.label")} {...register(`phones.${i}.label`)} />
                <Input placeholder={t("form.number")} {...register(`phones.${i}.number`)} />
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => setValue("phones", phones.filter((_, j) => j !== i))}>−</Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setValue("phones", [...phones, { label: "", number: "" }])}>{t("form.addPhone")}</Button>

          {emails.map((_, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input placeholder={t("form.label")} {...register(`emails.${i}.label`)} />
                <Input placeholder={t("form.email")} type="email" {...register(`emails.${i}.email`)} />
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => setValue("emails", emails.filter((_, j) => j !== i))}>−</Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setValue("emails", [...emails, { label: "", email: "" }])}>{t("form.addEmail")}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h3 className="font-medium">{t("form.location")}</h3></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("form.country")}</Label>
            <Select
              value={watch("country") || "__none__"}
              onValueChange={(v) => {
                const country = v === "__none__" ? "" : v;
                setValue("country", country);
                const cities = getCities(country);
                if (!cities.includes(watch("city") || "")) setValue("city", "");
              }}
            >
              <SelectTrigger><SelectValue placeholder={t("form.country")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("form.city")}</Label>
            {(() => {
              const country = watch("country") || "";
              const cities = getCities(country);
              if (cities.length === 0) {
                return <Input {...register("city")} placeholder={t("form.city")} />;
              }
              const currentCity = watch("city") || "";
              const cityOptions = Array.from(new Set([currentCity, ...cities].filter(Boolean))).sort();
              return (
                <Select
                  value={currentCity || "__none__"}
                  onValueChange={(v) => setValue("city", v === "__none__" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder={t("form.city")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {cityOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })()}
          </div>
          <div className="space-y-2">
            <Label>{t("form.address")}</Label>
            <Input {...register("address")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h3 className="font-medium">{t("form.work")}</h3></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("form.occupation")}</Label>
            <Input {...register("occupation")} />
          </div>
          <div className="space-y-2">
            <Label>{t("form.workplace")}</Label>
            <Input {...register("workplace")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h3 className="font-medium">{t("form.notesAndTags")}</h3></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("form.notes")}</Label>
            <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("notes")} />
          </div>
          <div className="space-y-2">
            <Label>{t("form.tags")}</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = watch("tagIds").includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      const current = watch("tagIds");
                      setValue("tagIds", selected ? current.filter((id) => id !== tag.id) : [...current, tag.id]);
                    }}
                    className={`rounded-full px-3 py-1 text-sm border ${selected ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>{personId ? t("form.save") : t("form.createPerson")}</Button>
        {personId && (
          <Button type="button" variant="outline" onClick={() => router.push(`/people/${personId}`)}>{t("form.cancel")}</Button>
        )}
      </div>
    </form>
  );
}
