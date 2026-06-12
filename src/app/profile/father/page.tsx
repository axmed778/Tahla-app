import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getFatherCandidates } from "@/actions/father";
import { AppHeader } from "@/components/app-header";
import { FatherSuggestion } from "@/components/father-suggestion";
import { getLocale, getT } from "@/lib/i18n";

export default async function ProfileFatherPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/lock");
  if (!user.personId) redirect("/profile/complete");

  const candidates = await getFatherCandidates(user.personId);
  const t = getT(await getLocale());

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <h2 className="text-xl font-semibold mb-2">{t("fatherCheck.title")}</h2>
        <p className="text-muted-foreground text-sm mb-6">{t("fatherCheck.subtitle")}</p>
        <FatherSuggestion personId={user.personId} candidates={candidates} />
      </main>
    </div>
  );
}
