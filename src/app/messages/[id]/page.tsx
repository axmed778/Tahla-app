import { notFound } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getMessages, getConversations } from "@/actions/messages";
import { AppHeader } from "@/components/app-header";
import { getLocale, getT } from "@/lib/i18n";
import Link from "next/link";
import { ChatView } from "./chat-view";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, messages, conversations] = await Promise.all([
    getCurrentUser(),
    getMessages(id),
    getConversations(),
  ]);
  const locale = await getLocale();
  const t = getT(locale);
  if (!user) return null;

  const currentConv = conversations.find((c) => c.id === id);
  if (!currentConv) notFound();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-6">
        <Link href="/messages" className="text-sm text-muted-foreground hover:text-foreground">← {t("messages.back")}</Link>
        <h2 className="text-xl font-semibold mt-2 mb-4">
          {currentConv.otherUser?.firstName} {currentConv.otherUser?.lastName}
        </h2>
        <ChatView conversationId={id} initialMessages={messages} currentUser={{ id: user.id, firstName: user.firstName, lastName: user.lastName }} />
      </main>
    </div>
  );
}
