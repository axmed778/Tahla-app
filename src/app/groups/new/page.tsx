import { getCurrentUser } from "@/actions/auth";
import { AppHeader } from "@/components/app-header";
import { getLocale, getT } from "@/lib/i18n";
import Link from "next/link";
import { CreateGroupForm } from "./create-group-form";

export default async function NewGroupPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const t = getT(locale);
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-xl px-4 py-6">
        <Link href="/groups" className="text-sm text-muted-foreground hover:text-foreground">← {t("groups.back")}</Link>
        <h2 className="text-xl font-semibold mt-4 mb-6">{t("groups.create")}</h2>
        <CreateGroupForm />
      </main>
    </div>
  );
}
