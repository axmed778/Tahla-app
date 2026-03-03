"use client";

import Link from "next/link";

type PersonNode = {
  id: string;
  firstName: string;
  lastName: string;
  parents: PersonNode[];
  spouse: PersonNode | null;
  children: PersonNode[];
  siblings: PersonNode[];
};

function PersonLabel({ n, nameOnly }: { n: PersonNode; nameOnly: boolean }) {
  const name = `${n.firstName} ${n.lastName}`;
  if (nameOnly) return <span className="font-medium">{name}</span>;
  return (
    <Link href={`/people/${n.id}`} className="font-medium hover:underline">
      {name}
    </Link>
  );
}

export function TreeView({ node, nameOnly, depth = 0 }: { node: PersonNode; nameOnly: boolean; depth?: number }) {
  const maxDepth = 4;
  if (depth > maxDepth) return null;

  return (
    <div className="space-y-6">
      {node.parents.length > 0 && (
        <div className="flex justify-center gap-4 flex-wrap">
          {node.parents.map((p) => (
            <div key={p.id} className="rounded-lg border bg-muted/30 px-4 py-2 text-center">
              <PersonLabel n={p} nameOnly={nameOnly} />
              <div className="mt-2">
                <TreeView node={p} nameOnly={nameOnly} depth={depth + 1} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center items-start gap-6 flex-wrap">
        <div className="rounded-lg border-2 border-primary bg-primary/10 px-5 py-3 text-center min-w-[140px]">
          <PersonLabel n={node} nameOnly={nameOnly} />
        </div>
        {node.spouse && (
          <div className="rounded-lg border bg-muted/30 px-5 py-3 text-center min-w-[140px]">
            <PersonLabel n={node.spouse} nameOnly={nameOnly} />
            <div className="mt-2">
              <TreeView node={node.spouse} nameOnly={nameOnly} depth={depth + 1} />
            </div>
          </div>
        )}
      </div>

      {node.children.length > 0 && (
        <div className="flex justify-center gap-4 flex-wrap border-t pt-6">
          {node.children.map((c) => (
            <div key={c.id} className="rounded-lg border bg-muted/30 px-4 py-2 text-center">
              <PersonLabel n={c} nameOnly={nameOnly} />
              <div className="mt-2">
                <TreeView node={c} nameOnly={nameOnly} depth={depth + 1} />
              </div>
            </div>
          ))}
        </div>
      )}

      {node.siblings.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground mb-2">Siblings</p>
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
