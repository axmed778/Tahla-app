"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { useTranslations } from "@/components/i18n-provider";
import { formatPersonName } from "@/lib/utils";
import {
  layoutAncestorTree,
  type LayoutInput,
  type PositionedNode,
} from "@/lib/tree-layout";
import {
  findKinshipPath,
  type KinshipPathDTO,
  type KinshipPersonDTO,
} from "@/actions/kinship";

type AncestorNode = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  parents: AncestorNode[];
  spouse: AncestorNode | null;
  siblings: AncestorNode[];
  hasMoreAncestors: boolean;
};

const PADDING = 40;
const MIN_SCALE = 0.2;
const MAX_SCALE = 2.5;

function toLayoutInput(node: AncestorNode): LayoutInput {
  return {
    id: node.id,
    label: formatPersonName(node),
    hasMoreAncestors: node.hasMoreAncestors,
    parents: node.parents.map(toLayoutInput),
  };
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function TreeView({
  node,
  nameOnly,
  people,
}: {
  node: AncestorNode;
  nameOnly: boolean;
  people: KinshipPersonDTO[];
}) {
  const t = useTranslations();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [otherId, setOtherId] = useState("");
  const [result, setResult] = useState<KinshipPathDTO | null>(null);
  const [kinError, setKinError] = useState<string | null>(null);
  const [finding, setFinding] = useState(false);

  const layout = useMemo(() => {
    return layoutAncestorTree(toLayoutInput(node), {
      spouse: node.spouse ? { id: node.spouse.id, label: formatPersonName(node.spouse) } : null,
      siblings: node.siblings.map((s) => ({ id: s.id, label: formatPersonName(s) })),
    });
  }, [node]);

  const nodeById = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    for (const n of layout.nodes) map.set(n.id, n);
    return map;
  }, [layout]);

  const pathIds = useMemo(() => new Set(result?.chain.map((c) => c.id) ?? []), [result]);
  const pathEdgeKeys = useMemo(() => {
    const set = new Set<string>();
    const chain = result?.chain ?? [];
    for (let i = 0; i < chain.length - 1; i++) set.add(edgeKey(chain[i].id, chain[i + 1].id));
    return set;
  }, [result]);
  const highlighting = pathIds.size > 0;

  const fitToView = useMemo(
    () => () => {
      const svg = svgRef.current;
      const zoomBehavior = zoomRef.current;
      if (!svg || !zoomBehavior) return;
      const rect = svg.getBoundingClientRect();
      const contentW = layout.width + PADDING * 2;
      const contentH = layout.height + PADDING * 2;
      const scale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, rect.width / contentW, rect.height / contentH)
      );
      const tx = (rect.width - layout.width * scale) / 2;
      const ty = (rect.height - layout.height * scale) / 2;
      select(svg).call(zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(scale));
    },
    [layout]
  );

  useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g) return;

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_SCALE, MAX_SCALE])
      .on("zoom", (event) => {
        select(g).attr("transform", event.transform.toString());
      });
    zoomRef.current = zoomBehavior;
    select(svg).call(zoomBehavior).on("dblclick.zoom", null);

    const id = requestAnimationFrame(fitToView);
    return () => cancelAnimationFrame(id);
  }, [fitToView]);

  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    const zoomBehavior = zoomRef.current;
    if (!svg || !zoomBehavior) return;
    select(svg).call(zoomBehavior.scaleBy, factor);
  };

  async function runFind() {
    if (!otherId) return;
    setFinding(true);
    setKinError(null);
    setResult(null);
    const res = await findKinshipPath(node.id, otherId);
    if ("error" in res) {
      setKinError(res.error);
    } else {
      setResult(res.path);
    }
    setFinding(false);
  }

  function clearFind() {
    setResult(null);
    setKinError(null);
    setOtherId("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-sm font-medium">{t("kinship.findRelation")}</label>
            <select
              value={otherId}
              onChange={(e) => setOtherId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("kinship.selectPerson")}</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={runFind}
            disabled={!otherId || finding}
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {t("kinship.find")}
          </button>
          {(result || kinError) && (
            <button
              type="button"
              onClick={clearFind}
              className="h-10 rounded-md border border-border px-4 text-sm hover:bg-muted"
            >
              {t("kinship.clear")}
            </button>
          )}
        </div>

        {kinError && <p className="mt-3 text-sm text-destructive">{kinError}</p>}
        {result && (
          <div className="mt-3 space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">{t("kinship.relation")}: </span>
              <span className="font-medium">{result.label}</span>
            </p>
            <p>
              <span className="text-muted-foreground">{t("kinship.totalWeight")}: </span>
              <span className="font-medium">{result.weight}</span>
            </p>
            {result.commonAncestor && (
              <p>
                <span className="text-muted-foreground">{t("kinship.commonAncestor")}: </span>
                <span className="font-medium">{result.commonAncestor.name}</span>
              </p>
            )}
            <p className="text-muted-foreground">
              {result.chain.map((c) => c.name).join(" → ")}
            </p>
          </div>
        )}
      </div>

      <div className="relative rounded-2xl border border-border bg-gradient-to-b from-muted/20 to-background">
        <div className="absolute right-3 top-3 z-10 flex gap-2">
          <button
            type="button"
            onClick={() => zoomBy(1.2)}
            className="h-9 w-9 rounded-md border border-border bg-background text-lg leading-none shadow-sm hover:bg-muted"
            aria-label={t("tree.zoomIn")}
            title={t("tree.zoomIn")}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(0.8)}
            className="h-9 w-9 rounded-md border border-border bg-background text-lg leading-none shadow-sm hover:bg-muted"
            aria-label={t("tree.zoomOut")}
            title={t("tree.zoomOut")}
          >
            −
          </button>
          <button
            type="button"
            onClick={fitToView}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm shadow-sm hover:bg-muted"
            aria-label={t("tree.fit")}
            title={t("tree.fit")}
          >
            {t("tree.fit")}
          </button>
        </div>

        <svg
          ref={svgRef}
          className="h-[70vh] w-full touch-none rounded-2xl"
          role="img"
          aria-label={t("tree.title")}
        >
          <g ref={gRef}>
            {layout.edges.map((e) => {
              const a = nodeById.get(e.fromId);
              const b = nodeById.get(e.toId);
              if (!a || !b) return null;
              const onPath = pathEdgeKeys.has(edgeKey(e.fromId, e.toId));
              const dim = highlighting && !onPath;
              return (
                <line
                  key={`${e.fromId}-${e.toId}`}
                  x1={a.x + a.width / 2}
                  y1={a.y + a.height / 2}
                  x2={b.x + b.width / 2}
                  y2={b.y + b.height / 2}
                  className={onPath ? "stroke-primary" : "stroke-muted-foreground/40"}
                  strokeWidth={onPath ? 3 : 1.5}
                  opacity={dim ? 0.2 : 1}
                />
              );
            })}
            {layout.nodes.map((n) => {
              const onPath = pathIds.has(n.id);
              const dim = highlighting && !onPath;
              const accent = highlighting && onPath;
              return (
                <foreignObject key={n.id} x={n.x} y={n.y} width={n.width} height={n.height} opacity={dim ? 0.25 : 1}>
                  <div
                    className={
                      accent
                        ? "flex h-full w-full items-center justify-center rounded-xl border-2 border-primary bg-primary/25 px-3 text-center shadow"
                        : n.kind === "focus"
                          ? "flex h-full w-full items-center justify-center rounded-xl border-2 border-primary bg-primary/15 px-3 text-center shadow-sm"
                          : n.kind === "spouse"
                            ? "flex h-full w-full items-center justify-center rounded-xl border border-border bg-muted/40 px-3 text-center shadow-sm"
                            : "flex h-full w-full items-center justify-center rounded-xl border border-border bg-background px-3 text-center shadow-sm"
                    }
                  >
                    {nameOnly ? (
                      <span className="text-sm font-medium leading-tight">{n.label}</span>
                    ) : (
                      <Link
                        href={`/people/${n.id}`}
                        className="text-sm font-medium leading-tight hover:underline"
                      >
                        {n.label}
                      </Link>
                    )}
                  </div>
                </foreignObject>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
