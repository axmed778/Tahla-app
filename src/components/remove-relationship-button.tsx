"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeRelationship } from "@/actions/relationships";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";

type RelationshipType = "PARENT" | "CHILD" | "SIBLING" | "SPOUSE" | "OTHER";

type Props = {
  fromPersonId: string;
  toPersonId: string;
  type: RelationshipType;
  /** Optional: only show as icon/text to keep UI compact */
  variant?: "default" | "ghost" | "link";
  size?: "sm" | "default" | "lg";
};

export function RemoveRelationshipButton({ fromPersonId, toPersonId, type, variant = "ghost", size = "sm" }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      await removeRelationship(fromPersonId, toPersonId, type);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className="text-muted-foreground hover:text-destructive"
      onClick={handleRemove}
      disabled={isPending}
      aria-label={t("relationship.remove")}
    >
      {isPending ? t("relationship.removing") : t("relationship.remove")}
    </Button>
  );
}
