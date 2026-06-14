import { getCurrentUser } from "@/actions/auth";
import { AppHeader } from "@/components/app-header";
import { getFeed } from "@/actions/feed";
import { prisma } from "@/lib/db";
import { getLocale, getT } from "@/lib/i18n";
import { FeedList } from "./feed-list";
import { CreatePostForm } from "./create-post-form";
import { FeedTabs } from "./feed-tabs";

type SearchParams = Promise<{ group?: string }>;

export default async function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const groupId = params.group?.trim() || null;
  const user = await getCurrentUser();
  if (!user) return null;

  const [posts, people, userGroups] = await Promise.all([
    getFeed(50, groupId),
    prisma.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, middleName: true, lastName: true, gender: true },
    }),
    prisma.groupMember.findMany({
      where: { userId: user.id },
      include: { group: { select: { id: true, name: true } } },
    }),
  ]);
  const locale = await getLocale();
  const t = getT(locale);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">{t("feed.title")}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{t("feed.subtitle")}</p>
        </div>
        <FeedTabs currentGroupId={groupId} groups={userGroups.map((m) => ({ id: m.group.id, name: m.group.name }))} />
        <CreatePostForm
          people={people}
          groupId={groupId}
          groups={userGroups.map((m) => ({ id: m.group.id, name: m.group.name }))}
          currentUser={{ firstName: user.firstName, lastName: user.lastName }}
        />
        <div className="mt-10 space-y-4">
          <FeedList posts={posts} />
        </div>
      </main>
    </div>
  );
}
