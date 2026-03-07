import { getCurrentUser } from "@/actions/auth";
import {
  getGroup,
  getCurrentUserRoleInGroup,
  setGroupVisibility,
  approveOrRejectApplication,
  applyToJoinGroup,
  joinGroup,
  leaveGroup,
} from "@/actions/groups";
import { AppHeader } from "@/components/app-header";
import { getLocale, getT } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GroupDetailClient } from "./group-detail-client";

type Props = { params: Promise<{ id: string }> };

export default async function GroupDetailPage({ params }: Props) {
  const { id: groupId } = await params;
  const [user, group, role] = await Promise.all([
    getCurrentUser(),
    getGroup(groupId),
    getCurrentUserRoleInGroup(groupId),
  ]);
  const locale = await getLocale();
  const t = getT(locale);
  if (!user) return null;
  if (!group) notFound();

  const isMember = role !== null;
  const isAdmin = role === "ADMIN";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <Link href="/groups" className="text-sm text-muted-foreground hover:underline mb-4 inline-block">
          {t("groups.back")}
        </Link>
        <h2 className="text-xl font-semibold">{group.name}</h2>
        {group.description && (
          <p className="text-muted-foreground text-sm mt-1">{group.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {group.isPrivate ? t("groups.private") : t("groups.public")} · {group.members.length} {t("groups.members")}
          {isAdmin && ` · ${t("groups.admin")}`}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {isMember ? (
            <>
              <Link
                href={`/feed?group=${encodeURIComponent(group.id)}`}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t("groups.feed")}
              </Link>
              <GroupDetailClient
                groupId={group.id}
                isPrivate={group.isPrivate}
                isAdmin={isAdmin}
                applications={group.applications}
                setGroupVisibility={setGroupVisibility}
                approveOrRejectApplication={approveOrRejectApplication}
                leaveGroup={leaveGroup}
              />
            </>
          ) : (
            <GroupDetailClient
              groupId={group.id}
              isPrivate={group.isPrivate}
              isAdmin={false}
              applications={[]}
              setGroupVisibility={setGroupVisibility}
              approveOrRejectApplication={approveOrRejectApplication}
              leaveGroup={leaveGroup}
              applyToJoinGroup={applyToJoinGroup}
              joinGroup={joinGroup}
            />
          )}
        </div>

        {isAdmin && (
          <section className="mt-8">
            <h3 className="font-medium mb-2">{t("groups.applications")}</h3>
            {group.applications.length > 0 ? (
              <ul className="space-y-2 rounded-lg border p-4">
                {group.applications.map((app) => (
                  <li key={app.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {app.user.firstName} {app.user.lastName}
                      {app.user.email && <span className="text-muted-foreground"> ({app.user.email})</span>}
                    </span>
                    <GroupDetailClient
                      groupId={group.id}
                      isPrivate={group.isPrivate}
                      isAdmin={true}
                      applications={[]}
                      setGroupVisibility={setGroupVisibility}
                      approveOrRejectApplication={approveOrRejectApplication}
                      leaveGroup={leaveGroup}
                      pendingUserId={app.user.id}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("groups.noApplications")}</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
