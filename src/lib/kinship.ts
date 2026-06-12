/**
 * Pure kinship graph utilities: build an undirected weighted graph from family edges,
 * find the shortest relationship path with Dijkstra, describe that path in human terms,
 * and compute a spanning tree (Kruskal) for an optional clan-wide highlight mode.
 *
 * No DB access here so everything is unit-testable. Direction is preserved per step
 * ("parent" = move to a parent, "child" = move to a child, "spouse" = move to a spouse)
 * which lets `describeRelation` name the relationship.
 */

/** A directed family fact. PARENT means `from` is the parent of `to`. SPOUSE is symmetric. */
export type FamilyEdge = { from: string; to: string; type: "PARENT" | "SPOUSE" };

export type StepRelation = "parent" | "child" | "spouse";

export type GraphNeighbor = { to: string; weight: number; relation: StepRelation };
export type KinshipGraph = Map<string, GraphNeighbor[]>;

export type KinshipPath = {
  nodes: string[];
  steps: StepRelation[];
  weight: number;
};

const PARENT_WEIGHT = 1;
const SPOUSE_WEIGHT = 1;

function addNeighbor(graph: KinshipGraph, from: string, neighbor: GraphNeighbor): void {
  const list = graph.get(from);
  if (list) {
    if (!list.some((n) => n.to === neighbor.to && n.relation === neighbor.relation)) {
      list.push(neighbor);
    }
  } else {
    graph.set(from, [neighbor]);
  }
}

/**
 * Build an undirected adjacency map. Each PARENT edge yields two directed neighbors:
 * child→parent ("parent") and parent→child ("child"). SPOUSE yields a "spouse" link both ways.
 */
export function buildKinshipGraph(edges: FamilyEdge[]): KinshipGraph {
  const graph: KinshipGraph = new Map();
  for (const e of edges) {
    if (e.from === e.to) continue;
    if (e.type === "PARENT") {
      // from is parent of to: moving to->from is going to a parent; from->to is going to a child.
      addNeighbor(graph, e.to, { to: e.from, weight: PARENT_WEIGHT, relation: "parent" });
      addNeighbor(graph, e.from, { to: e.to, weight: PARENT_WEIGHT, relation: "child" });
    } else {
      addNeighbor(graph, e.from, { to: e.to, weight: SPOUSE_WEIGHT, relation: "spouse" });
      addNeighbor(graph, e.to, { to: e.from, weight: SPOUSE_WEIGHT, relation: "spouse" });
    }
  }
  return graph;
}

/**
 * Dijkstra shortest path between two persons. Returns null when no path exists. The path
 * includes the per-step relation so the relationship can be named. Ties are broken by a
 * lexicographic node order so results are deterministic.
 */
export function dijkstra(graph: KinshipGraph, start: string, goal: string): KinshipPath | null {
  if (start === goal) return { nodes: [start], steps: [], weight: 0 };

  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; relation: StepRelation }>();
  const visited = new Set<string>();
  dist.set(start, 0);

  // Simple O(V^2) selection — graphs here are clan-sized, so a heap is unnecessary.
  const allNodes = new Set<string>([start, goal]);
  for (const [k, ns] of graph) {
    allNodes.add(k);
    for (const n of ns) allNodes.add(n.to);
  }

  while (visited.size < allNodes.size) {
    let current: string | null = null;
    let best = Infinity;
    for (const node of allNodes) {
      if (visited.has(node)) continue;
      const d = dist.get(node) ?? Infinity;
      if (d < best || (d === best && current !== null && node < current)) {
        best = d;
        current = node;
      }
    }
    if (current === null || best === Infinity) break;
    if (current === goal) break;
    visited.add(current);

    for (const neighbor of graph.get(current) ?? []) {
      if (visited.has(neighbor.to)) continue;
      const nd = best + neighbor.weight;
      const existing = dist.get(neighbor.to) ?? Infinity;
      if (nd < existing) {
        dist.set(neighbor.to, nd);
        prev.set(neighbor.to, { node: current, relation: neighbor.relation });
      }
    }
  }

  if ((dist.get(goal) ?? Infinity) === Infinity) return null;

  const nodes: string[] = [goal];
  const steps: StepRelation[] = [];
  let cursor = goal;
  while (cursor !== start) {
    const p = prev.get(cursor);
    if (!p) return null;
    steps.push(p.relation);
    nodes.push(p.node);
    cursor = p.node;
  }
  nodes.reverse();
  steps.reverse();
  return { nodes, steps, weight: dist.get(goal) ?? 0 };
}

function greats(prefix: number, base: string): string {
  return `${"great-".repeat(Math.max(0, prefix))}${base}`;
}

function ancestorLabel(up: number): string {
  if (up === 1) return "parent";
  if (up === 2) return "grandparent";
  return greats(up - 2, "grandparent");
}

function descendantLabel(down: number): string {
  if (down === 1) return "child";
  if (down === 2) return "grandchild";
  return greats(down - 2, "grandchild");
}

function ordinal(n: number): string {
  const names = ["first", "second", "third", "fourth", "fifth"];
  return names[n - 1] ?? `${n}th`;
}

function removed(n: number): string {
  if (n === 0) return "";
  if (n === 1) return " once removed";
  if (n === 2) return " twice removed";
  return ` ${n} times removed`;
}

export type RelationDescription = {
  label: string;
  commonAncestorId: string | null;
  weight: number;
};

/**
 * Turn a shortest path into a human-readable relationship label. Handles direct lineage,
 * siblings, uncles/aunts, nieces/nephews, and cousins (with "removed" degrees). Paths that
 * cross a marriage are labelled as in-laws. Returns the common ancestor id when the path is
 * a clean up-then-down lineage.
 */
export function describeRelation(path: KinshipPath): RelationDescription {
  const { steps, weight, nodes } = path;
  if (steps.length === 0) return { label: "self", commonAncestorId: null, weight };

  const spouseCount = steps.filter((s) => s === "spouse").length;
  const up = steps.filter((s) => s === "parent").length;
  const down = steps.filter((s) => s === "child").length;

  if (spouseCount === steps.length && spouseCount === 1) {
    return { label: "spouse", commonAncestorId: null, weight };
  }

  // Common ancestor only meaningful for a clean up-then-down blood lineage.
  const cleanLineage =
    spouseCount === 0 &&
    steps.slice(0, up).every((s) => s === "parent") &&
    steps.slice(up).every((s) => s === "child");
  const commonAncestorId = cleanLineage && up > 0 && down > 0 ? nodes[up] : null;

  const blood = bloodLabel(up, down);
  if (spouseCount > 0) {
    return { label: `${blood} (in-law)`, commonAncestorId: null, weight };
  }
  return { label: blood, commonAncestorId, weight };
}

function bloodLabel(up: number, down: number): string {
  if (up === 0 && down === 0) return "self";
  if (down === 0) return ancestorLabel(up);
  if (up === 0) return descendantLabel(down);
  if (up === 1 && down === 1) return "sibling";
  if (up === 1 && down >= 2) return greats(down - 2, "niece or nephew");
  if (down === 1 && up >= 2) return greats(up - 2, "uncle or aunt");
  // up >= 2 && down >= 2 → cousins
  const degree = Math.min(up, down) - 1;
  return `${ordinal(degree)} cousin${removed(Math.abs(up - down))}`;
}

export type SpanningEdge = { from: string; to: string; weight: number };

/**
 * Kruskal minimum spanning tree over the (undirected) kinship graph. Edge weights are all
 * positive, so this yields a spanning forest connecting everyone reachable. Used for the
 * optional clan-wide relationship highlight.
 */
export function kruskalMST(graph: KinshipGraph): SpanningEdge[] {
  const seen = new Set<string>();
  const edges: SpanningEdge[] = [];
  for (const [from, neighbors] of graph) {
    for (const n of neighbors) {
      const key = from < n.to ? `${from}|${n.to}` : `${n.to}|${from}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from, to: n.to, weight: n.weight });
    }
  }
  edges.sort((a, b) => a.weight - b.weight || a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = x;
    while ((parent.get(root) ?? root) !== root) root = parent.get(root) ?? root;
    let cur = x;
    while (cur !== root) {
      const next = parent.get(cur) ?? cur;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string): boolean => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    parent.set(ra, rb);
    return true;
  };

  const mst: SpanningEdge[] = [];
  for (const e of edges) {
    if (union(e.from, e.to)) mst.push(e);
  }
  return mst;
}
