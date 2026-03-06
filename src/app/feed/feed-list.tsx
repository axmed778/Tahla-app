"use client";

import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";
import { formatPersonName } from "@/lib/utils";
import { addComment } from "@/actions/feed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type RelatedPerson = { id: string; firstName: string; middleName: string | null; lastName: string };

type Post = {
  id: string;
  type: string;
  content: string;
  createdAt: Date;
  author: { id: string; firstName: string; lastName: string };
  relatedPeople: { person: RelatedPerson }[];
  images: { id: string; imageUrl: string }[];
  comments: {
    id: string;
    content: string;
    createdAt: Date;
    author: { id: string; firstName: string; lastName: string };
  }[];
};

export function FeedList({ posts }: { posts: Post[] }) {
  const t = useTranslations();

  if (posts.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("feed.noPosts")}</p>;
  }

  return (
    <ul className="space-y-4">
      {posts.map((post) => (
        <li key={post.id} className="rounded-lg border p-4 bg-background">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span className="font-medium text-foreground">
              {post.author.firstName} {post.author.lastName}
            </span>
            <span>·</span>
            <span>{t(`feed.types.${post.type}`)}</span>
            {post.relatedPeople.length > 0 && (
              <>
                <span>·</span>
                {post.relatedPeople.map(({ person }, i) => (
                  <span key={person.id}>
                    {i > 0 && ", "}
                    <Link href={`/people/${person.id}`} className="hover:underline">
                      {formatPersonName(person)}
                    </Link>
                  </span>
                ))}
              </>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap">{post.content}</p>
          {post.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {post.images.map((img) => (
                <div key={img.id} className="relative w-32 h-32 rounded overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(post.createdAt).toLocaleString()}
          </p>
          <div className="mt-3 pt-3 border-t space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("feed.comments")}</p>
            {post.comments.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-medium">{c.author.firstName} {c.author.lastName}</span>
                <span className="text-muted-foreground"> · </span>
                <span>{c.content}</span>
                <span className="text-xs text-muted-foreground ml-1">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
            ))}
            <CommentForm postId={post.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CommentForm({ postId }: { postId: string }) {
  const t = useTranslations();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!content.trim()) return;
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.set("postId", postId);
    formData.set("content", content.trim());
    const result = await addComment(formData);
    setLoading(false);
    if (result?.error) setError(result.error);
    else setContent("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("feed.commentPlaceholder")}
        className="flex-1"
      />
      <Button type="submit" size="sm" disabled={loading}>{t("feed.addComment")}</Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
