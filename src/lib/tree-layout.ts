/**
 * Pure layout for the bottom-up ancestor tree. The focus person sits at the bottom and
 * parents stack upward. Coordinates are computed with a post-order sweep so a node is
 * horizontally centered over its parents — this works for any number of parents (0..N)
 * and never overlaps siblings within a generation. No DOM / React here, so it is testable.
 */

export type LayoutNodeKind = "focus" | "ancestor" | "spouse" | "sibling";

/** Minimal input tree: each node carries its parents (the generation above it). */
export type LayoutInput = {
  id: string;
  label: string;
  parents: LayoutInput[];
  hasMoreAncestors?: boolean;
};

export type PositionedNode = {
  id: string;
  label: string;
  kind: LayoutNodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  hasMoreAncestors: boolean;
};

export type LayoutEdge = { fromId: string; toId: string };

export type TreeLayout = {
  nodes: PositionedNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
};

export type LayoutOptions = {
  nodeWidth?: number;
  nodeHeight?: number;
  hGap?: number;
  vGap?: number;
  /** Spouse of the focus node, placed to its right. */
  spouse?: { id: string; label: string } | null;
  /** Siblings of the focus node, placed to its left. */
  siblings?: { id: string; label: string }[];
};

const DEFAULTS = { nodeWidth: 140, nodeHeight: 56, hGap: 28, vGap: 64 };

/**
 * Compute positions for the focus node + its ancestors, plus optional spouse/siblings
 * placed in the focus row. Returns absolute, non-negative coordinates and the overall
 * bounding size so the caller can fit-to-view.
 */
export function layoutAncestorTree(root: LayoutInput, options: LayoutOptions = {}): TreeLayout {
  const nodeWidth = options.nodeWidth ?? DEFAULTS.nodeWidth;
  const nodeHeight = options.nodeHeight ?? DEFAULTS.nodeHeight;
  const hGap = options.hGap ?? DEFAULTS.hGap;
  const vGap = options.vGap ?? DEFAULTS.vGap;

  // First pass: assign a slot (column index) to every node via post-order over parents,
  // and record each node's depth (0 = focus at the bottom).
  type Tmp = { input: LayoutInput; depth: number; slot: number };
  const tmp = new Map<string, Tmp>();
  const edges: LayoutEdge[] = [];
  let nextSlot = 0;
  let maxDepth = 0;

  const assign = (input: LayoutInput, depth: number): number => {
    maxDepth = Math.max(maxDepth, depth);
    let slot: number;
    if (input.parents.length === 0) {
      slot = nextSlot;
      nextSlot += 1;
    } else {
      const parentSlots = input.parents.map((p) => {
        edges.push({ fromId: p.id, toId: input.id });
        return assign(p, depth + 1);
      });
      slot = parentSlots.reduce((a, b) => a + b, 0) / parentSlots.length;
    }
    tmp.set(input.id, { input, depth, slot });
    return slot;
  };
  assign(root, 0);

  const colStep = nodeWidth + hGap;
  const rowStep = nodeHeight + vGap;

  const nodes: PositionedNode[] = [];
  for (const { input, depth, slot } of tmp.values()) {
    nodes.push({
      id: input.id,
      label: input.label,
      kind: input.id === root.id ? "focus" : "ancestor",
      x: slot * colStep,
      y: (maxDepth - depth) * rowStep,
      width: nodeWidth,
      height: nodeHeight,
      hasMoreAncestors: input.hasMoreAncestors ?? false,
    });
  }

  // Place spouse to the right of the focus, siblings to the left, in the focus row.
  const focus = tmp.get(root.id)!;
  const focusX = focus.slot * colStep;
  const focusY = maxDepth * rowStep;

  if (options.spouse) {
    nodes.push({
      id: options.spouse.id,
      label: options.spouse.label,
      kind: "spouse",
      x: focusX + colStep,
      y: focusY,
      width: nodeWidth,
      height: nodeHeight,
      hasMoreAncestors: false,
    });
    edges.push({ fromId: root.id, toId: options.spouse.id });
  }

  const siblings = options.siblings ?? [];
  siblings.forEach((s, i) => {
    nodes.push({
      id: s.id,
      label: s.label,
      kind: "sibling",
      x: focusX - colStep * (i + 1),
      y: focusY,
      width: nodeWidth,
      height: nodeHeight,
      hasMoreAncestors: false,
    });
  });

  // Normalize to non-negative coordinates and compute the bounding box.
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  for (const n of nodes) {
    n.x -= minX;
    n.y -= minY;
  }
  const width = Math.max(...nodes.map((n) => n.x + n.width));
  const height = Math.max(...nodes.map((n) => n.y + n.height));

  return { nodes, edges, width, height };
}
