import { describe, it, expect } from "vitest";
import {
  layoutAncestorTree,
  layoutDescendantTree,
  type LayoutInput,
  type DescendantLayoutInput,
} from "./tree-layout";

const opts = { nodeWidth: 100, nodeHeight: 40, hGap: 20, vGap: 60 };
const colStep = 100 + 20;
const rowStep = 40 + 60;

function node(id: string, parents: LayoutInput[] = []): LayoutInput {
  return { id, label: id, parents };
}

describe("layoutAncestorTree", () => {
  it("places a lone focus node at the origin", () => {
    const layout = layoutAncestorTree(node("a"), opts);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0]).toMatchObject({ id: "a", x: 0, y: 0, kind: "focus" });
    expect(layout.edges).toHaveLength(0);
  });

  it("stacks parents above the focus and centers the focus over them", () => {
    const root = node("c", [node("f"), node("m")]);
    const layout = layoutAncestorTree(root, opts);
    const byId = new Map(layout.nodes.map((n) => [n.id, n]));
    const f = byId.get("f")!;
    const m = byId.get("m")!;
    const c = byId.get("c")!;
    // parents share the top row, focus is one row below (larger y => bottom).
    expect(f.y).toBe(0);
    expect(m.y).toBe(0);
    expect(c.y).toBe(rowStep);
    // focus is centered horizontally between its two parents.
    expect(c.x).toBe((f.x + m.x) / 2);
    expect(layout.edges).toHaveLength(2);
  });

  it("handles a single parent (no overlap, centered)", () => {
    const root = node("c", [node("f")]);
    const layout = layoutAncestorTree(root, opts);
    const byId = new Map(layout.nodes.map((n) => [n.id, n]));
    expect(byId.get("c")!.x).toBe(byId.get("f")!.x);
  });

  it("places spouse to the right and siblings to the left of the focus", () => {
    const layout = layoutAncestorTree(node("c"), {
      ...opts,
      spouse: { id: "s", label: "s" },
      siblings: [{ id: "b1", label: "b1" }],
    });
    const byId = new Map(layout.nodes.map((n) => [n.id, n]));
    const c = byId.get("c")!;
    const s = byId.get("s")!;
    const b1 = byId.get("b1")!;
    expect(s.kind).toBe("spouse");
    expect(b1.kind).toBe("sibling");
    expect(s.x).toBe(c.x + colStep);
    expect(b1.x).toBe(c.x - colStep);
    expect(s.y).toBe(c.y);
    expect(b1.y).toBe(c.y);
  });

  it("links siblings to the focus's father and centers the father over all children", () => {
    const root = node("c", [node("dad")]);
    const layout = layoutAncestorTree(root, {
      ...opts,
      siblings: [{ id: "b1", label: "b1" }, { id: "b2", label: "b2" }],
    });
    const byId = new Map(layout.nodes.map((n) => [n.id, n]));
    const dad = byId.get("dad")!;
    const c = byId.get("c")!;
    const b1 = byId.get("b1")!;
    const b2 = byId.get("b2")!;
    // father has a parent edge to every child (focus + both siblings).
    const parentEdges = layout.edges.filter((e) => e.type === "parent" && e.fromId === "dad");
    expect(new Set(parentEdges.map((e) => e.toId))).toEqual(new Set(["c", "b1", "b2"]));
    // father is one row above the children and centered over their average x.
    expect(dad.y).toBe(0);
    expect(c.y).toBe(rowStep);
    expect(dad.x).toBe((b1.x + b2.x + c.x) / 3);
  });

  it("tags spouse edges with the spouse type", () => {
    const layout = layoutAncestorTree(node("c"), {
      ...opts,
      spouse: { id: "s", label: "s" },
    });
    const spouseEdges = layout.edges.filter((e) => e.type === "spouse");
    expect(spouseEdges).toEqual([{ fromId: "c", toId: "s", type: "spouse" }]);
  });

  it("normalizes coordinates to be non-negative and reports bounds", () => {
    const root = node("c", [node("f"), node("m")]);
    const layout = layoutAncestorTree(root, {
      ...opts,
      siblings: [{ id: "b1", label: "b1" }],
    });
    expect(Math.min(...layout.nodes.map((n) => n.x))).toBe(0);
    expect(Math.min(...layout.nodes.map((n) => n.y))).toBe(0);
    expect(layout.width).toBe(Math.max(...layout.nodes.map((n) => n.x + n.width)));
    expect(layout.height).toBe(Math.max(...layout.nodes.map((n) => n.y + n.height)));
  });
});

function dnode(
  id: string,
  children: DescendantLayoutInput[] = [],
  isFocus = false
): DescendantLayoutInput {
  return { id, label: id, isFocus, children };
}

describe("layoutDescendantTree", () => {
  it("places a lone root at the origin", () => {
    const layout = layoutDescendantTree(dnode("a"), opts);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0]).toMatchObject({ id: "a", x: 0, y: 0 });
    expect(layout.edges).toHaveLength(0);
  });

  it("puts the root on top and children below, centered over them", () => {
    const root = dnode("root", [dnode("c1"), dnode("c2")]);
    const layout = layoutDescendantTree(root, opts);
    const byId = new Map(layout.nodes.map((n) => [n.id, n]));
    const r = byId.get("root")!;
    const c1 = byId.get("c1")!;
    const c2 = byId.get("c2")!;
    expect(r.y).toBe(0);
    expect(c1.y).toBe(rowStep);
    expect(c2.y).toBe(rowStep);
    expect(r.x).toBe((c1.x + c2.x) / 2);
    expect(layout.edges).toHaveLength(2);
  });

  it("renders collateral branches (an ancestor's other child shows up)", () => {
    // apex with two children; one of them is the focus's parent, the other is a great-uncle.
    const root = dnode("apex", [
      dnode("grandpaBrother", [dnode("cousin")]),
      dnode("grandpa", [dnode("focus", [], true)]),
    ]);
    const layout = layoutDescendantTree(root, opts);
    const ids = new Set(layout.nodes.map((n) => n.id));
    // The collateral line (grandpa's brother + cousin) is present, not just the focus spine.
    expect(ids.has("grandpaBrother")).toBe(true);
    expect(ids.has("cousin")).toBe(true);
    expect(layout.nodes.find((n) => n.id === "focus")!.kind).toBe("focus");
  });

  it("stacks generations downward by depth", () => {
    const root = dnode("g0", [dnode("g1", [dnode("g2")])]);
    const layout = layoutDescendantTree(root, opts);
    const byId = new Map(layout.nodes.map((n) => [n.id, n]));
    expect(byId.get("g0")!.y).toBe(0);
    expect(byId.get("g1")!.y).toBe(rowStep);
    expect(byId.get("g2")!.y).toBe(2 * rowStep);
  });

  it("normalizes coordinates to be non-negative and reports bounds", () => {
    const root = dnode("root", [dnode("c1"), dnode("c2"), dnode("c3")]);
    const layout = layoutDescendantTree(root, opts);
    expect(Math.min(...layout.nodes.map((n) => n.x))).toBe(0);
    expect(Math.min(...layout.nodes.map((n) => n.y))).toBe(0);
    expect(layout.width).toBe(Math.max(...layout.nodes.map((n) => n.x + n.width)));
    expect(layout.height).toBe(Math.max(...layout.nodes.map((n) => n.y + n.height)));
  });
});
