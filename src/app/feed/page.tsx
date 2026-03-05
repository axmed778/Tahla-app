import { getCurrentUser } from "@/actions/auth";
import { AppHeader } from "@/components/app-header";
import { getFeed } from "@/actions/feed";
import { prisma } from "@/lib/db";
import { getLocale, getT } from "@/lib/i18n";
import { FeedList } from "./feed-list";
import { CreatePostForm } from "./create-post-form";

export default async function FeedPage() {
  const [user, posts, people] = await Promise.all([
    getCurrentUser(),
    getFeed(),
    prisma.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, middleName: true, lastName: true },
    }),
  ]);
  const locale = await getLocale();
  const t = getT(locale);
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <h2 className="text-xl font-semibold mb-4">{t("feed.title")}</h2>
        <p className="text-muted-foreground text-sm mb-6">
          {t("feed.subtitle")}
        </p>
        <CreatePostForm people={people} />
        <div className="mt-8 space-y-4">
          <FeedList posts={posts} />
        </div>
      </main>
    </div>
  );
}
