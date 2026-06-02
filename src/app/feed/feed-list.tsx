"use client";

import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";
import { cn, formatPersonName } from "@/lib/utils";
import { addComment } from "@/actions/feed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { X } from "lucide-react";
import { POST_TYPE_BADGE, type PostType } from "@/lib/feed";

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

function authorInitials(first: string, last: string) {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return (a + b).toUpperCase() || "?";
}

function typeBadgeClass(type: string) {
  return POST_TYPE_BADGE[type as PostType] ?? "bg-muted text-muted-foreground";
}

export function FeedList({ posts }: { posts: Post[] }) {
  const t = useTranslations();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">{t("feed.noPosts")}</p>
      </div>
    );
  }

  return (
    <>
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxUrl(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && setLightboxUrl(null)}
          aria-label="Close"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <ul className="space-y-5">
        {posts.map((post) => (
          <li key={post.id}>
            <Card className="overflow-hidden border shadow-md transition-shadow hover:shadow-lg">
              <CardHeader className="space-y-0 pb-3 pt-5">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-2 ring-background"
                    aria-label={`${post.author.firstName} ${post.author.lastName}`}
                  >
                    {authorInitials(post.author.firstName, post.author.lastName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold leading-tight">
                        {post.author.firstName} {post.author.lastName}
                      </span>
                      <span
                        className={cn(
                          "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          typeBadgeClass(post.type)
                        )}
                      >
                        {t(`feed.types.${post.type}`)}
                      </span>
                    </div>
                    <time
                      dateTime={new Date(post.createdAt).toISOString()}
                      className="text-xs text-muted-foreground"
                    >
                      {new Date(post.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-0 px-6 pb-4 pt-0">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
                {post.images.length > 0 && (
                  <div
                    className={cn(
                      "mt-4 -mx-6",
                      post.images.length === 1 ? "" : "grid gap-0 sm:grid-cols-2 sm:gap-px sm:bg-border"
                    )}
                  >
                    {post.images.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        className={cn(
                          "relative block w-full overflow-hidden bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          post.images.length === 1 ? "max-h-[min(480px,70vh)]" : "aspect-square sm:aspect-auto sm:max-h-64"
                        )}
                        onClick={() => setLightboxUrl(img.imageUrl)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.imageUrl}
                          alt=""
                          className={cn(
                            "h-full w-full object-cover transition hover:opacity-[0.98]",
                            post.images.length === 1 ? "max-h-[min(480px,70vh)]" : ""
                          )}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
              {post.relatedPeople.length > 0 && (
                <CardFooter className="flex flex-wrap gap-2 border-t bg-muted/30 px-6 py-3">
                  <div className="flex flex-wrap gap-2">
                    {post.relatedPeople.map(({ person }) => (
                      <Link
                        key={person.id}
                        href={`/people/${person.id}`}
                        className="inline-flex items-center rounded-full border border-primary/25 bg-background px-3 py-1 text-sm font-medium text-primary shadow-sm transition hover:bg-primary/10"
                      >
                        {formatPersonName(person)}
                      </Link>
                    ))}
                  </div>
                </CardFooter>
              )}
              <div className="border-t px-6 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("feed.comments")}</p>
                <div className="space-y-3">
                  {post.comments.map((c) => (
                    <div key={c.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                      <span className="font-medium">{c.author.firstName}</span>{" "}
                      <span className="font-medium">{c.author.lastName}</span>
                      <span className="text-muted-foreground"> · </span>
                      <span>{c.content}</span>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>
                  ))}
                  <CommentForm postId={post.id} />
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
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
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("feed.commentPlaceholder")}
          className="flex-1 rounded-full border-muted bg-background"
        />
        <Button type="submit" size="sm" className="shrink-0 rounded-full px-4" disabled={loading}>
          {t("feed.addComment")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
