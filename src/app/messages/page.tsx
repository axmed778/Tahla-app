import { getCurrentUser } from "@/actions/auth";
import { getConversations } from "@/actions/messages";
import { AppHeader } from "@/components/app-header";
import { getLocale, getT } from "@/lib/i18n";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { NewConversationForm } from "./new-conversation-form";

export default async function MessagesPage() {
  const [user, conversations, allUsers] = await Promise.all([
    getCurrentUser(),
    getConversations(),
    prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);
  const locale = await getLocale();
  const t = getT(locale);
  if (!user) return null;

  const otherUsers = user ? allUsers.filter((u) => u.id !== user.id) : [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <h2 className="text-xl font-semibold mb-4">{t("messages.title")}</h2>
        <NewConversationForm users={otherUsers} />
        <ul className="mt-6 space-y-2">
          {conversations.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("messages.noConversations")}</p>
          ) : (
            conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className="block rounded-lg border p-4 hover:bg-muted/50"
                >
                  <span className="font-medium">
                    {c.otherUser?.firstName} {c.otherUser?.lastName}
                  </span>
                  {c.lastMessage && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {c.lastMessage.sender.firstName}: {c.lastMessage.content}
                    </p>
                  )}
                </Link>
              </li>
            ))
          )}
        </ul>
      </main>
    </div>
  );
}
