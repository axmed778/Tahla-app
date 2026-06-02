import { getCurrentUser } from "@/actions/auth";
import { AppHeader } from "@/components/app-header";
import { Directory } from "@/components/directory";

type SearchParams = Promise<{ q?: string; city?: string; maritalStatus?: string; gender?: string; sort?: string; page?: string }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto px-4 py-6">
        <Directory searchParams={searchParams} />
      </main>
    </div>
  );
}
