"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { confirmFather, type FatherCandidateDTO } from "@/actions/father";
import { useTranslations } from "@/components/i18n-provider";

type Props = {
  personId: string;
  candidates: FatherCandidateDTO[];
};

function fullName(c: FatherCandidateDTO): string {
  return [c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ");
}

export function FatherSuggestion({ personId, candidates }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    candidates.length === 1 ? candidates[0].id : null
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function skip() {
    router.push("/");
  }

  async function confirm() {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    const result = await confirmFather(personId, selectedId);
    if ("error" in result) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(`/people/${personId}`);
  }

  if (candidates.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">{t("fatherCheck.none")}</p>
          </CardContent>
        </Card>
        <Button onClick={skip}>{t("fatherCheck.continue")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {candidates.length === 1 ? t("fatherCheck.oneFound") : t("fatherCheck.manyFound")}
      </p>
      <div className="space-y-2">
        {candidates.map((c) => {
          const selected = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left text-sm transition ${
                selected ? "border-primary bg-primary/5" : "border-input hover:bg-muted"
              }`}
            >
              <span className="font-medium">{fullName(c)}</span>
              {c.surnameMatches && (
                <span className="text-xs text-muted-foreground">
                  {t("fatherCheck.surnameMatches")}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={confirm} disabled={busy || !selectedId}>
          {t("fatherCheck.confirm")}
        </Button>
        <Button variant="outline" onClick={skip} disabled={busy}>
          {t("fatherCheck.skip")}
        </Button>
      </div>
    </div>
  );
}
