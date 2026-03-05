"use client";

import Link from "next/link";
import { formatPersonName } from "@/lib/utils";
import { useTranslations } from "@/components/i18n-provider";

type PersonNode = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  parents: PersonNode[];
  spouse: PersonNode | null;
  children: PersonNode[];
  siblings: PersonNode[];
};

function PersonLabel({ n, nameOnly }: { n: PersonNode; nameOnly: boolean }) {
  const name = formatPersonName(n);
  if (nameOnly) return <span className="font-medium">{name}</span>;
  return (
    <Link href={`/people/${n.id}`} className="font-medium hover:underline">
      {name}
    </Link>
  );
}

function ArrowDown() {
  return (
    <div className="flex justify-center py-1 text-muted-foreground" aria-hidden>
      <span className="text-lg">↓</span>
    </div>
  );
}

function ArrowSpouse() {
  return (
    <span className="inline-flex items-center px-2 text-muted-foreground" aria-hidden>
      <span className="text-lg">↔</span>
    </span>
  );
}

export function TreeView({ node, nameOnly }: { node: PersonNode; nameOnly: boolean }) {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      {/* Parents (one level only) — arrow down to central */}
      {node.parents.length > 0 && (
        <>
          <div className="flex justify-center gap-3 flex-wrap items-center">
            {node.parents.map((p, i) => (
              <div key={p.id} className="rounded-lg border bg-muted/30 px-4 py-2 text-center">
                <PersonLabel n={p} nameOnly={nameOnly} />
              </div>
            ))}
          </div>
          <ArrowDown />
        </>
      )}

      {/* Central person + spouse (one level only), arrow between if spouse */}
      <div className="flex justify-center items-center gap-2 flex-wrap">
        <div className="rounded-lg border-2 border-primary bg-primary/10 px-5 py-3 text-center min-w-[140px]">
          <PersonLabel n={node} nameOnly={nameOnly} />
        </div>
        {node.spouse && (
          <>
            <ArrowSpouse />
            <div className="rounded-lg border bg-muted/30 px-5 py-3 text-center min-w-[140px]">
              <PersonLabel n={node.spouse} nameOnly={nameOnly} />
            </div>
          </>
        )}
      </div>

      {/* Children (one level only) — arrow down from central */}
      {node.children.length > 0 && (
        <>
          <ArrowDown />
          <div className="flex justify-center gap-3 flex-wrap">
            {node.children.map((c) => (
              <div key={c.id} className="rounded-lg border bg-muted/30 px-4 py-2 text-center">
                <PersonLabel n={c} nameOnly={nameOnly} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Siblings (one level only, no recursion) */}
      {node.siblings.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <p className="text-xs text-muted-foreground mb-2">{t("tree.siblings")}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {node.siblings.map((s) => (
              <div key={s.id} className="rounded-md border bg-background px-3 py-1.5 text-sm">
                <PersonLabel n={s} nameOnly={nameOnly} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
