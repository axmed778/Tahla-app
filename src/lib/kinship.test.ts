import { describe, it, expect } from "vitest";
import {
  buildKinshipGraph,
  dijkstra,
  describeRelation,
  kruskalMST,
  type FamilyEdge,
} from "./kinship";

// A small family:
//   grandpa -> dad, grandpa -> uncle
//   dad -> me, dad -> sister
//   uncle -> cousin
//   me <-> wife (spouse)
const edges: FamilyEdge[] = [
  { from: "grandpa", to: "dad", type: "PARENT" },
  { from: "grandpa", to: "uncle", type: "PARENT" },
  { from: "dad", to: "me", type: "PARENT" },
  { from: "dad", to: "sister", type: "PARENT" },
  { from: "uncle", to: "cousin", type: "PARENT" },
  { from: "me", to: "wife", type: "SPOUSE" },
];

const graph = buildKinshipGraph(edges);

describe("buildKinshipGraph", () => {
  it("links child to parent and parent to child", () => {
    const meNeighbors = graph.get("me") ?? [];
    expect(meNeighbors).toContainEqual({ to: "dad", weight: 1, relation: "parent" });
    const dadNeighbors = graph.get("dad") ?? [];
    expect(dadNeighbors).toContainEqual({ to: "me", weight: 1, relation: "child" });
  });

  it("links spouses both ways", () => {
    expect(graph.get("me") ?? []).toContainEqual({ to: "wife", weight: 1, relation: "spouse" });
    expect(graph.get("wife") ?? []).toContainEqual({ to: "me", weight: 1, relation: "spouse" });
  });
});

describe("dijkstra", () => {
  it("returns a zero-length path for the same person", () => {
    const p = dijkstra(graph, "me", "me");
    expect(p).toEqual({ nodes: ["me"], steps: [], weight: 0 });
  });

  it("finds parent (weight 1)", () => {
    const p = dijkstra(graph, "me", "dad");
    expect(p?.weight).toBe(1);
    expect(p?.steps).toEqual(["parent"]);
  });

  it("finds an uncle going up to the grandparent then down", () => {
    const p = dijkstra(graph, "me", "uncle");
    expect(p?.weight).toBe(3);
    expect(p?.steps).toEqual(["parent", "parent", "child"]);
    expect(p?.nodes).toEqual(["me", "dad", "grandpa", "uncle"]);
  });

  it("finds a cousin via the common grandparent", () => {
    const p = dijkstra(graph, "me", "cousin");
    expect(p?.weight).toBe(4);
    expect(p?.steps).toEqual(["parent", "parent", "child", "child"]);
    expect(p?.nodes).toEqual(["me", "dad", "grandpa", "uncle", "cousin"]);
  });

  it("finds a sibling at weight 2", () => {
    const p = dijkstra(graph, "me", "sister");
    expect(p?.weight).toBe(2);
    expect(p?.steps).toEqual(["parent", "child"]);
  });

  it("returns null when unreachable", () => {
    const p = dijkstra(graph, "me", "nobody");
    expect(p).toBeNull();
  });
});

describe("describeRelation", () => {
  it("labels a parent", () => {
    expect(describeRelation(dijkstra(graph, "me", "dad")!).label).toBe("parent");
  });

  it("labels a grandparent", () => {
    expect(describeRelation(dijkstra(graph, "me", "grandpa")!).label).toBe("grandparent");
  });

  it("labels a sibling", () => {
    expect(describeRelation(dijkstra(graph, "me", "sister")!).label).toBe("sibling");
  });

  it("labels an uncle/aunt", () => {
    expect(describeRelation(dijkstra(graph, "me", "uncle")!).label).toBe("uncle or aunt");
  });

  it("labels a first cousin and reports the common ancestor", () => {
    const desc = describeRelation(dijkstra(graph, "me", "cousin")!);
    expect(desc.label).toBe("first cousin");
    expect(desc.commonAncestorId).toBe("grandpa");
    expect(desc.weight).toBe(4);
  });

  it("labels a spouse", () => {
    expect(describeRelation(dijkstra(graph, "me", "wife")!).label).toBe("spouse");
  });

  it("labels an in-law across a marriage", () => {
    const desc = describeRelation(dijkstra(graph, "wife", "dad")!);
    expect(desc.label).toBe("parent (in-law)");
  });
});

describe("kruskalMST", () => {
  it("produces a spanning tree with V-1 edges for a connected graph", () => {
    const mst = kruskalMST(graph);
    const nodes = new Set<string>();
    for (const e of mst) {
      nodes.add(e.from);
      nodes.add(e.to);
    }
    // 7 connected people (grandpa, dad, uncle, me, sister, cousin, wife) => 6 edges.
    expect(nodes.size).toBe(7);
    expect(mst).toHaveLength(6);
  });

  it("has no cycles (each edge connects two previously separate components)", () => {
    const mst = kruskalMST(graph);
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      let r = x;
      while ((parent.get(r) ?? r) !== r) r = parent.get(r) ?? r;
      return r;
    };
    for (const e of mst) {
      const ra = find(e.from);
      const rb = find(e.to);
      expect(ra).not.toBe(rb);
      parent.set(ra, rb);
    }
  });
});
