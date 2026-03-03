"use client";

import Link from "next/link";
import { useTranslations } from "@/components/i18n-provider";

type Post = {
  id: string;
  type: string;
  content: string;
  createdAt: Date;
  author: { id: string; firstName: string; lastName: string };
  relatedPerson: { id: string; firstName: string; lastName: string } | null;
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
            {post.relatedPerson && (
              <>
                <span>·</span>
                <Link href={`/people/${post.relatedPerson.id}`} className="hover:underline">
                  {post.relatedPerson.firstName} {post.relatedPerson.lastName}
                </Link>
              </>
            )}
          </div>
          <p className="text-sm">{post.content}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(post.createdAt).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
