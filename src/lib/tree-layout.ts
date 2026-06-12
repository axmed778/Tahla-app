/**
 * Pure layout for the bottom-up ancestor tree. The focus person and its siblings sit in the
 * bottom row; parents stack upward and are horizontally centered over all of their children
 * (focus + siblings). Coordinates are computed generation by generation with a barycenter
 * sweep, so a parent box always sits above the middle of its children regardless of how many
 * children (1..N) it has. No DOM / React here, so it is testable.
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

/** Parent edges run parent -> child (down); spouse edges run focus -> spouse (sideways). */
export type LayoutEdge = { fromId: string; toId: string; type: "parent" | "spouse" };

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
  /** Siblings of the focus node, placed to its left and linked to the focus's parent(s). */
  siblings?: { id: string; label: string }[];
};

const DEFAULTS = { nodeWidth: 140, nodeHeight: 56, hGap: 28, vGap: 64 };

type Tmp = {
  id: string;
  label: string;
  kind: LayoutNodeKind;
  depth: number;
  hasMoreAncestors: boolean;
  x: number;
};

/**
 * Compute positions for the focus node + its ancestors, plus optional spouse/siblings.
 * Returns absolute, non-negative coordinates and the overall bounding size so the caller
 * can fit-to-view.
 */
export function layoutAncestorTree(root: LayoutInput, options: LayoutOptions = {}): TreeLayout {
  const nodeWidth = options.nodeWidth ?? DEFAULTS.nodeWidth;
  const nodeHeight = options.nodeHeight ?? DEFAULTS.nodeHeight;
  const hGap = options.hGap ?? DEFAULTS.hGap;
  const vGap = options.vGap ?? DEFAULTS.vGap;
  const colStep = nodeWidth + hGap;
  const rowStep = nodeHeight + vGap;

  const tmp = new Map<string, Tmp>();
  const childrenIds = new Map<string, string[]>();
  const edges: LayoutEdge[] = [];
  let maxDepth = 0;

  const addChild = (parentId: string, childId: string) => {
    const arr = childrenIds.get(parentId);
    if (arr) arr.push(childId);
    else childrenIds.set(parentId, [childId]);
  };

  // Walk the ancestor spine: record each node's depth and the parent -> child links.
  const visit = (input: LayoutInput, depth: number): void => {
    maxDepth = Math.max(maxDepth, depth);
    if (!tmp.has(input.id)) {
      tmp.set(input.id, {
        id: input.id,
        label: input.label,
        kind: input.id === root.id ? "focus" : "ancestor",
        depth,
        hasMoreAncestors: input.hasMoreAncestors ?? false,
        x: 0,
      });
    }
    for (const p of input.parents) {
      addChild(p.id, input.id);
      edges.push({ fromId: p.id, toId: input.id, type: "parent" });
      visit(p, depth + 1);
    }
  };
  visit(root, 0);

  // Siblings share the focus's direct parents and live in the bottom row.
  const directParentIds = root.parents.map((p) => p.id);
  const siblings = options.siblings ?? [];
  for (const s of siblings) {
    if (!tmp.has(s.id)) {
      tmp.set(s.id, { id: s.id, label: s.label, kind: "sibling", depth: 0, hasMoreAncestors: false, x: 0 });
    }
    for (const pid of directParentIds) {
      addChild(pid, s.id);
      edges.push({ fromId: pid, toId: s.id, type: "parent" });
    }
  }

  // Spouse sits to the right of the focus and is linked only to the focus.
  if (options.spouse) {
    tmp.set(options.spouse.id, {
      id: options.spouse.id,
      label: options.spouse.label,
      kind: "spouse",
      depth: 0,
      hasMoreAncestors: false,
      x: 0,
    });
    edges.push({ fromId: root.id, toId: options.spouse.id, type: "spouse" });
  }

  // Bottom row (depth 0) order: siblings..., focus, spouse — assigned sequential columns.
  const bottomOrder: string[] = [
    ...siblings.map((s) => s.id),
    root.id,
    ...(options.spouse ? [options.spouse.id] : []),
  ];
  bottomOrder.forEach((id, i) => {
    const n = tmp.get(id);
    if (n) n.x = i * colStep;
  });

  // Each higher generation: center every node over the average x of its children, then
  // resolve same-row overlaps while keeping the generation centered over its children.
  for (let depth = 1; depth <= maxDepth; depth++) {
    const gen = [...tmp.values()].filter((n) => n.depth === depth);
    if (gen.length === 0) continue;

    for (const n of gen) {
      const kids = childrenIds.get(n.id);
      if (kids && kids.length > 0) {
        const sum = kids.reduce((acc, id) => acc + (tmp.get(id)?.x ?? 0), 0);
        n.x = sum / kids.length;
      }
    }

    gen.sort((a, b) => a.x - b.x);
    const meanBefore = gen.reduce((acc, n) => acc + n.x, 0) / gen.length;
    for (let i = 1; i < gen.length; i++) {
      const minX = gen[i - 1].x + colStep;
      if (gen[i].x < minX) gen[i].x = minX;
    }
    const meanAfter = gen.reduce((acc, n) => acc + n.x, 0) / gen.length;
    const shift = meanBefore - meanAfter;
    if (shift !== 0) for (const n of gen) n.x += shift;
  }

  const nodes: PositionedNode[] = [...tmp.values()].map((n) => ({
    id: n.id,
    label: n.label,
    kind: n.kind,
    x: n.x,
    y: (maxDepth - n.depth) * rowStep,
    width: nodeWidth,
    height: nodeHeight,
    hasMoreAncestors: n.hasMoreAncestors,
  }));

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

/** Input for the top-down family tree: each node carries its children (generation below). */
export type DescendantLayoutInput = {
  id: string;
  label: string;
  isFocus?: boolean;
  hasMoreDescendants?: boolean;
  children: DescendantLayoutInput[];
};

/**
 * Classic tidy top-down layout for the full family tree rooted at the apical ancestor.
 * Leaves are placed left-to-right; each parent is centered over its children. The root
 * sits in the top row (y = 0) and generations grow downward. Pure (no DOM), so testable.
 */
export function layoutDescendantTree(
  root: DescendantLayoutInput,
  options: LayoutOptions = {}
): TreeLayout {
  const nodeWidth = options.nodeWidth ?? DEFAULTS.nodeWidth;
  const nodeHeight = options.nodeHeight ?? DEFAULTS.nodeHeight;
  const hGap = options.hGap ?? DEFAULTS.hGap;
  const vGap = options.vGap ?? DEFAULTS.vGap;
  const colStep = nodeWidth + hGap;
  const rowStep = nodeHeight + vGap;

  const nodes: PositionedNode[] = [];
  const edges: LayoutEdge[] = [];
  let nextLeafX = 0;

  // Post-order: position children first, then center the parent over them.
  const place = (n: DescendantLayoutInput, depth: number): number => {
    let x: number;
    if (n.children.length === 0) {
      x = nextLeafX;
      nextLeafX += colStep;
    } else {
      const childXs = n.children.map((c) => {
        const cx = place(c, depth + 1);
        edges.push({ fromId: n.id, toId: c.id, type: "parent" });
        return cx;
      });
      x = (childXs[0] + childXs[childXs.length - 1]) / 2;
    }
    nodes.push({
      id: n.id,
      label: n.label,
      kind: n.isFocus ? "focus" : "ancestor",
      x,
      y: depth * rowStep,
      width: nodeWidth,
      height: nodeHeight,
      // Reuse the "more to load" flag the UI already understands.
      hasMoreAncestors: n.hasMoreDescendants ?? false,
    });
    return x;
  };
  place(root, 0);

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
