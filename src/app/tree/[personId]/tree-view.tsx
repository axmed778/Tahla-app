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

/** Build ancestor pyramid rows up to N generations back (default 4 => 16 → 8 → 4 → 2 → 1). */
function buildAncestorRows(node: PersonNode, backDepth = 4): (PersonNode | null)[][] {
  const rowsBottomUp: (PersonNode | null)[][] = [];
  rowsBottomUp.push([node]);
  for (let level = 1; level <= backDepth; level++) {
    const prev = rowsBottomUp[level - 1];
    const next: (PersonNode | null)[] = [];
    for (const p of prev) {
      next.push(p?.parents[0] ?? null, p?.parents[1] ?? null);
    }
    rowsBottomUp.push(next);
  }
  return rowsBottomUp.reverse(); // top to bottom
}

function buildDescendantRows(node: PersonNode, forwardDepth = 4): PersonNode[][] {
  const rows: PersonNode[][] = [];
  let current: PersonNode[] = node.children ?? [];
  for (let level = 1; level <= forwardDepth; level++) {
    if (!current.length) break;
    rows.push(current);
    const next: PersonNode[] = [];
    for (const c of current) {
      for (const gc of c.children ?? []) next.push(gc);
    }
    current = next;
  }
  return rows;
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
  const ancestorRows = buildAncestorRows(node, 4);
  const descendants = buildDescendantRows(node, 4);
  const hasAncestors = ancestorRows.slice(0, -1).some((r) => r.some(Boolean));

  return (
    <div className="space-y-0">
      {/* Generation pyramid: ancestors (4 back) */}
      {hasAncestors ? (
        <div
          className="relative rounded-2xl border border-border bg-gradient-to-b from-muted/20 to-background p-6 md:p-8"
          style={{
            backgroundImage: "radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--muted) / 0.15), transparent 60%)",
          }}
        >
          <h2 className="sr-only">{t("tree.title")}</h2>

          {ancestorRows.map((row, idx) => {
            const isBottom = idx === ancestorRows.length - 1;
            const expected = Math.pow(2, ancestorRows.length - 1 - idx);
            const keyPrefix = `anc-${ancestorRows.length - 1 - idx}`;
            return (
              <div key={keyPrefix}>
                <div className={isBottom ? "flex justify-center pt-1" : "flex flex-wrap justify-center gap-2 md:gap-3 mb-2"}>
                  {row.map((n, i) => (
                    <NodeBox
                      key={n?.id ?? `${keyPrefix}-${i}`}
                      n={n}
                      nameOnly={nameOnly}
                      highlight={isBottom}
                    />
                  ))}
                </div>
                {!isBottom && <ConnectorLines fromCount={expected} toCount={Math.max(1, expected / 2)} />}
              </div>
            );
          })}
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

      {/* Descendants (forward N generations) */}
      {descendants.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <p className="text-xs text-muted-foreground mb-3">
            Descendants (up to 4 generations)
          </p>
          <div className="space-y-4">
            {descendants.map((row, i) => (
              <div key={`desc-${i}`} className="flex flex-wrap justify-center gap-2">
                {row.map((p) => (
                  <div key={p.id} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                    <PersonLabel n={p} nameOnly={nameOnly} />
                  </div>
                ))}
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
