import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/actions/auth";
import { AppHeader } from "@/components/app-header";
import { QuickAddForm } from "./quick-add-form";

export default async function NewPersonPage() {
  const [user, tags] = await Promise.all([
    getCurrentUser(),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Add person</h2>
          <p className="text-muted-foreground text-sm">Quick add with name and phone, or go to full form.</p>
        </div>
        <QuickAddForm tags={tags} />
      </main>
    </div>
  );
}
