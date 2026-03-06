"use client";

import { useState } from "react";
import { sendMessage } from "@/actions/messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/components/i18n-provider";

type Message = {
  id: string;
  content: string;
  createdAt: Date;
  sender: { id: string; firstName: string; lastName: string };
};

export function ChatView({
  conversationId,
  initialMessages,
  currentUser,
}: {
  conversationId: string;
  initialMessages: Message[];
  currentUser: { id: string; firstName: string; lastName: string };
}) {
  const t = useTranslations();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(initialMessages);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    const formData = new FormData();
    formData.set("conversationId", conversationId);
    formData.set("content", content.trim());
    const result = await sendMessage(formData);
    setLoading(false);
    if (result?.error) return;
    setMessages((prev) => [
      ...prev,
      {
        id: "temp-" + Date.now(),
        content: content.trim(),
        createdAt: new Date(),
        sender: { id: currentUser.id, firstName: currentUser.firstName, lastName: currentUser.lastName },
      },
    ]);
    setContent("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 min-h-[300px] max-h-[50vh] overflow-y-auto space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.sender.id === currentUser.id ? "text-right" : "text-left"}
          >
            <span className="text-xs text-muted-foreground">
              {m.sender.id !== currentUser.id && `${m.sender.firstName} ${m.sender.lastName} · `}
              {new Date(m.createdAt).toLocaleString()}
            </span>
            <p className="text-sm mt-0.5">{m.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("messages.writeMessage")}
          className="flex-1"
        />
        <Button type="submit" disabled={loading}>{t("messages.send")}</Button>
      </form>
    </div>
  );
}
