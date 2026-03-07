"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";

type Application = {
  id: string;
  user: { id: string; firstName: string; lastName: string; email?: string };
};

type Props = {
  groupId: string;
  isPrivate: boolean;
  isAdmin: boolean;
  applications: Application[];
  setGroupVisibility: (formData: FormData) => Promise<{ error?: string }>;
  approveOrRejectApplication: (formData: FormData) => Promise<{ error?: string }>;
  leaveGroup: (formData: FormData) => Promise<{ error?: string }>;
  applyToJoinGroup?: (formData: FormData) => Promise<{ error?: string }>;
  joinGroup?: (formData: FormData) => Promise<{ error?: string }>;
  pendingUserId?: string;
};

export function GroupDetailClient({
  groupId,
  isPrivate,
  isAdmin,
  setGroupVisibility,
  approveOrRejectApplication,
  leaveGroup,
  applyToJoinGroup,
  joinGroup,
  pendingUserId,
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (
    key: string,
    action: () => Promise<{ error?: string }>
  ) => {
    setError(null);
    setLoading(key);
    const result = await action();
    setLoading(null);
    if (result?.error) setError(result.error);
    else router.refresh();
  };

  if (pendingUserId) {
    return (
      <span className="flex gap-1">
        <Button
          size="sm"
          variant="default"
          disabled={!!loading}
          onClick={() =>
            run("approve", () => {
              const fd = new FormData();
              fd.set("groupId", groupId);
              fd.set("userId", pendingUserId);
              fd.set("action", "approve");
              return approveOrRejectApplication(fd);
            })
          }
        >
          {t("groups.approve")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!!loading}
          onClick={() =>
            run("reject", () => {
              const fd = new FormData();
              fd.set("groupId", groupId);
              fd.set("userId", pendingUserId);
              fd.set("action", "reject");
              return approveOrRejectApplication(fd);
            })
          }
        >
          {t("groups.reject")}
        </Button>
      </span>
    );
  }

  const isMember = leaveGroup !== undefined && !applyToJoinGroup && !joinGroup;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isMember && (
        <form
          action={leaveGroup}
          onSubmit={() => setLoading("leave")}
          className="inline"
        >
          <input type="hidden" name="groupId" value={groupId} />
          <Button type="submit" variant="outline" size="sm" disabled={!!loading}>
            {t("groups.leaveGroup")}
          </Button>
        </form>
      )}

      {isAdmin && (
        <form
          action={setGroupVisibility}
          onSubmit={() => setLoading("visibility")}
          className="inline"
        >
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="isPrivate" value={isPrivate ? "false" : "true"} />
          <Button type="submit" variant="outline" size="sm" disabled={!!loading}>
            {isPrivate ? t("groups.setPublic") : t("groups.setPrivate")}
          </Button>
        </form>
      )}

      {!isMember && isPrivate && applyToJoinGroup && (
        <Button
          size="sm"
          disabled={!!loading}
          onClick={() =>
            run("apply", () => {
              const fd = new FormData();
              fd.set("groupId", groupId);
              return applyToJoinGroup(fd);
            })
          }
        >
          {t("groups.applyToJoin")}
        </Button>
      )}

      {!isMember && !isPrivate && joinGroup && (
        <form action={joinGroup} onSubmit={() => setLoading("join")} className="inline">
          <input type="hidden" name="groupId" value={groupId} />
          <Button type="submit" size="sm" disabled={!!loading}>
            {t("groups.joinGroup")}
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-destructive w-full">{error}</p>}
    </div>
  );
}
