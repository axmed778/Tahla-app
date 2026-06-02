import { getCurrentUser } from "@/actions/auth";
import { AppHeader } from "@/components/app-header";
import { getFriends, getUsersNotFriends, getIncomingFriendRequests, getSentFriendRequests } from "@/actions/friends";
import { getLocale, getT } from "@/lib/i18n";
import { FriendsList } from "./friends-list";
import { AddFriendForm } from "./add-friend-form";
import { IncomingRequests } from "./incoming-requests";
import { SentRequests } from "./sent-requests";

export default async function FriendsPage() {
  const [user, friends, notFriends, incoming, sent, locale, t] = await Promise.all([
    getCurrentUser(),
    getFriends(),
    getUsersNotFriends(),
    getIncomingFriendRequests(),
    getSentFriendRequests(),
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
        <IncomingRequests requests={incoming} />
        <SentRequests requests={sent} />
        <div className="mb-6">
          <h3 className="font-medium mb-3">{t("friends.addFriend")}</h3>
          <AddFriendForm users={notFriends} />
        </div>
        <div>
          <h3 className="font-medium mb-3">{t("friends.yourFriends")}</h3>
          <FriendsList friends={friends} />
        </div>
      </main>
    </div>
  );
}
