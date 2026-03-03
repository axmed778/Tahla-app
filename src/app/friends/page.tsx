import { getCurrentUser } from "@/actions/auth";
import { AppHeader } from "@/components/app-header";
import { getFriends, getUsersNotFriends } from "@/actions/friends";
import { getLocale, getT } from "@/lib/i18n";
import { FriendsList } from "./friends-list";
import { AddFriendForm } from "./add-friend-form";

export default async function FriendsPage() {
  const [user, friends, notFriends, locale, t] = await Promise.all([
    getCurrentUser(),
    getFriends(),
    getUsersNotFriends(),
    getLocale(),
    getLocale().then((l) => getT(l)),
  ]);
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <h2 className="text-xl font-semibold mb-2">{t("friends.title")}</h2>
        <p className="text-muted-foreground text-sm mb-6">
          {t("friends.subtitle")}
        </p>
        <AddFriendForm users={notFriends} />
        <div className="mt-8">
          <h3 className="font-medium mb-3">{t("friends.yourFriends")}</h3>
          <FriendsList friends={friends} />
        </div>
      </main>
    </div>
  );
}
