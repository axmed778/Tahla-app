"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  confirmFather,
  searchClanFathersByName,
  type FatherCandidateDTO,
} from "@/actions/father";
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

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<FatherCandidateDTO[]>([]);

  function skip() {
    router.push("/");
  }

  async function runSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    setError(null);
    const found = await searchClanFathersByName(q);
    setResults(found);
    setSearched(true);
    setSearching(false);
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

  function renderCandidate(c: FatherCandidateDTO) {
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
          <span className="text-xs text-muted-foreground">{t("fatherCheck.surnameMatches")}</span>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {candidates.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {candidates.length === 1 ? t("fatherCheck.oneFound") : t("fatherCheck.manyFound")}
          </p>
          {candidates.map(renderCandidate)}
        </div>
      )}

      <form onSubmit={runSearch} className="space-y-2">
        <Label htmlFor="fatherSearch">{t("fatherCheck.searchLabel")}</Label>
        <p className="text-xs text-muted-foreground">{t("fatherCheck.searchHint")}</p>
        <div className="flex gap-2">
          <Input
            id="fatherSearch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("fatherCheck.searchPlaceholder")}
            autoComplete="off"
          />
          <Button type="submit" variant="outline" disabled={searching || query.trim().length < 2}>
            {t("fatherCheck.searchButton")}
          </Button>
        </div>
      </form>

      {searched && results.length > 0 && (
        <div className="space-y-2">{results.map(renderCandidate)}</div>
      )}
      {searched && results.length === 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">{t("fatherCheck.searchNoResults")}</p>
          </CardContent>
        </Card>
      )}

      {candidates.length === 0 && !searched && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">{t("fatherCheck.none")}</p>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={confirm} disabled={busy || !selectedId}>
          {t("fatherCheck.confirm")}
        </Button>
        <Button variant="outline" onClick={skip} disabled={busy}>
          {candidates.length === 0 && results.length === 0
            ? t("fatherCheck.continue")
            : t("fatherCheck.skip")}
        </Button>
      </div>
    </div>
  );
}
