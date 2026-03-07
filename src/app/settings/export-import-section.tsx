"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getExportData, importData, type ImportMode } from "@/actions/import-export";
import { useTranslations } from "@/components/i18n-provider";

export function ExportImportSection() {
  const t = useTranslations();
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    const data = await getExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tahla-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>, mode: ImportMode) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSuccess(false);
    setLoading(true);
    const text = await file.text();
    const result = await importData(text, mode);
    setLoading(false);
    e.target.value = "";
    if (result.error) {
      setImportError(result.error);
      return;
    }
    setImportSuccess(true);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <div>
        <Button onClick={handleExport} variant="outline">{t("settings.exportButton")}</Button>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.exportHint")}</p>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">{t("settings.importTitle")}</p>
        <p className="text-sm text-muted-foreground mb-2">{t("settings.importHint")}</p>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground cursor-pointer disabled:opacity-50">
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => handleImport(e, "replace")}
              disabled={loading}
            />
            {t("settings.replaceAll")}
          </label>
          <label className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground cursor-pointer disabled:opacity-50">
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => handleImport(e, "merge")}
              disabled={loading}
            />
            {t("settings.merge")}
          </label>
        </div>
        {importError && <p className="text-sm text-destructive mt-2">{importError}</p>}
        {importSuccess && <p className="text-sm text-green-600 mt-2">{t("settings.importSuccess")}</p>}
      </div>
    </div>
  );
}
