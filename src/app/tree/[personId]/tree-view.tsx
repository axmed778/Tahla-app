"use client";

import { useEffect, useMemo, useRef } from "react";
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

export function TreeView({ node, nameOnly }: { node: AncestorNode; nameOnly: boolean }) {
  const t = useTranslations();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

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

    // Fit on mount (next frame so the SVG has measured dimensions).
    const id = requestAnimationFrame(fitToView);
    return () => cancelAnimationFrame(id);
  }, [fitToView]);

  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    const zoomBehavior = zoomRef.current;
    if (!svg || !zoomBehavior) return;
    select(svg).call(zoomBehavior.scaleBy, factor);
  };

  return (
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
            const x1 = a.x + a.width / 2;
            const y1 = a.y + a.height / 2;
            const x2 = b.x + b.width / 2;
            const y2 = b.y + b.height / 2;
            return (
              <line
                key={`${e.fromId}-${e.toId}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className="stroke-muted-foreground/40"
                strokeWidth={1.5}
              />
            );
          })}
          {layout.nodes.map((n) => (
            <foreignObject key={n.id} x={n.x} y={n.y} width={n.width} height={n.height}>
              <div
                className={
                  n.kind === "focus"
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
                {n.hasMoreAncestors && (
                  <span
                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground"
                    title={t("tree.moreAncestors")}
                    aria-hidden
                  >
                    ⋯
                  </span>
                )}
              </div>
            </foreignObject>
          ))}
        </g>
      </svg>
    </div>
  );
}
