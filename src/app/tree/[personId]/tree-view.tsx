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

/** Build ancestor pyramid rows: row[0] = main user (1), row[1] = parents (2), row[2] = grandparents (4), row[3] = great-grandparents (8). */
function buildAncestorRows(node: PersonNode): (PersonNode | null)[][] {
  const row0: (PersonNode | null)[] = [node];
  const row1: (PersonNode | null)[] = [
    node.parents[0] ?? null,
    node.parents[1] ?? null,
  ];
  const row2: (PersonNode | null)[] = [
    row1[0]?.parents[0] ?? null,
    row1[0]?.parents[1] ?? null,
    row1[1]?.parents[0] ?? null,
    row1[1]?.parents[1] ?? null,
  ];
  const row3: (PersonNode | null)[] = [
    row2[0]?.parents[0] ?? null,
    row2[0]?.parents[1] ?? null,
    row2[1]?.parents[0] ?? null,
    row2[1]?.parents[1] ?? null,
    row2[2]?.parents[0] ?? null,
    row2[2]?.parents[1] ?? null,
    row2[3]?.parents[0] ?? null,
    row2[3]?.parents[1] ?? null,
  ];
  return [row3, row2, row1, row0]; // top to bottom: 8 → 4 → 2 → 1
}

function PersonLabel({ n, nameOnly }: { n: PersonNode; nameOnly: boolean }) {
  const name = formatPersonName(n);
  if (nameOnly) return <span className="font-medium">{name}</span>;
  return (
    <Link href={`/people/${n.id}`} className="font-medium hover:underline">
      {name}
    </Link>
  );
}

function NodeBox({
  n,
  nameOnly,
  highlight,
}: {
  n: PersonNode | null;
  nameOnly: boolean;
  highlight?: boolean;
}) {
  if (!n)
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 min-w-[100px] min-h-[52px] flex items-center justify-center" aria-hidden>
        <span className="text-xs text-muted-foreground">—</span>
      </div>
    );
  return (
    <div
      className={
        highlight
          ? "rounded-xl border-2 border-primary bg-primary/15 shadow-sm px-4 py-3 text-center min-w-[110px]"
          : "rounded-xl border border-border bg-background px-4 py-3 text-center min-w-[100px] shadow-sm"
      }
    >
      <PersonLabel n={n} nameOnly={nameOnly} />
    </div>
  );
}

/** Connector line between two rows (dashed). */
function ConnectorLines({ fromCount, toCount }: { fromCount: number; toCount: number }) {
  return (
    <div className="flex justify-center py-2" aria-hidden>
      <div
        className="border-l border-r border-b border-dashed border-muted-foreground/40 rounded-b"
        style={{
          width: "80%",
          minHeight: 24,
          borderTop: "none",
        }}
      />
    </div>
  );
}

export function TreeView({ node, nameOnly }: { node: PersonNode; nameOnly: boolean }) {
  const t = useTranslations();
  const rows = buildAncestorRows(node);
  const hasAncestors = rows[0].some(Boolean) || rows[1].some(Boolean) || rows[2].some(Boolean);

  return (
    <div className="space-y-0">
      {/* Pro-style ancestor pyramid: 8 → 4 → 2 → 1 */}
      {hasAncestors ? (
        <div
          className="relative rounded-2xl border border-border bg-gradient-to-b from-muted/20 to-background p-6 md:p-8"
          style={{
            backgroundImage: "radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--muted) / 0.15), transparent 60%)",
          }}
        >
          <h2 className="sr-only">{t("tree.title")}</h2>
          {/* Row 3: 8 great-grandparents */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-2">
            {rows[0].map((n, i) => (
              <NodeBox key={n?.id ?? `ggp-${i}`} n={n} nameOnly={nameOnly} />
            ))}
          </div>
          <ConnectorLines fromCount={8} toCount={4} />
          {/* Row 2: 4 grandparents */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-2">
            {rows[1].map((n, i) => (
              <NodeBox key={n?.id ?? `gp-${i}`} n={n} nameOnly={nameOnly} />
            ))}
          </div>
          <ConnectorLines fromCount={4} toCount={2} />
          {/* Row 1: 2 parents */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-2">
            {rows[2].map((n, i) => (
              <NodeBox key={n?.id ?? `p-${i}`} n={n} nameOnly={nameOnly} />
            ))}
          </div>
          <ConnectorLines fromCount={2} toCount={1} />
          {/* Row 0: main user (you) */}
          <div className="flex justify-center pt-1">
            <NodeBox n={rows[3][0]} nameOnly={nameOnly} highlight />
          </div>
        </div>
      ) : null}

      {/* Spouse next to main user if no ancestors, or below pyramid */}
      {node.spouse && (
        <div className="flex justify-center items-center gap-3 flex-wrap mt-4">
          <span className="text-sm text-muted-foreground">{t("tree.spouse")}</span>
          <div className="rounded-xl border bg-muted/30 px-4 py-2">
            <PersonLabel n={node.spouse} nameOnly={nameOnly} />
          </div>
        </div>
      )}

      {/* Children (below main user) */}
      {node.children.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <p className="text-xs text-muted-foreground mb-2">{t("tree.children")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {node.children.map((c) => (
              <div key={c.id} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <PersonLabel n={c} nameOnly={nameOnly} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Siblings */}
      {node.siblings.length > 0 && (
        <div className="mt-4 pt-4 border-t">
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

      {/* If no ancestors at all, show just the main user in a box */}
      {!hasAncestors && (
        <div className="rounded-xl border-2 border-primary bg-primary/10 px-6 py-4 text-center">
          <PersonLabel n={node} nameOnly={nameOnly} />
          <p className="text-xs text-muted-foreground mt-2">Add parents in the profile to build the tree above.</p>
        </div>
      )}
    </div>
  );
}
