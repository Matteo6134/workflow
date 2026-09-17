import { describe, expect, it } from "vitest";
import { buildWires, bowFor, wireBetween, wireBounds, type Rect } from "./connections";

const rect = (x: number, y: number, w = 200, h = 100): Rect => ({
  x,
  y,
  width: w,
  height: h,
});

describe("wireBetween", () => {
  it("leaves the right edge and arrives at the left edge, both at mid-height", () => {
    const { start, end } = wireBetween(rect(0, 0), rect(400, 200));
    expect(start).toEqual({ x: 200, y: 50 });
    expect(end).toEqual({ x: 400, y: 250 });
  });

  it("produces a cubic bezier", () => {
    const { d } = wireBetween(rect(0, 0), rect(400, 0));
    expect(d.startsWith("M ")).toBe(true);
    expect(d).toContain("C ");
  });

  it("stays horizontal at both ends, so wires meet ports squarely", () => {
    const { d, start, end } = wireBetween(rect(0, 0), rect(600, 300));
    const [, c1y, , c2y] = d
      .slice(d.indexOf("C ") + 2)
      .split(/[\s]+/)
      .map(Number);
    // First control point shares the start's y, second shares the end's y.
    expect(c1y).toBeCloseTo(start.y, 1);
    expect(c2y).toBeCloseTo(end.y, 1);
  });
});

describe("bowFor", () => {
  it("scales with the horizontal gap", () => {
    expect(bowFor({ x: 0, y: 0 }, { x: 600, y: 0 })).toBeGreaterThan(
      bowFor({ x: 0, y: 0 }, { x: 200, y: 0 }),
    );
  });

  it("clamps so short hops stay taut and long ones do not balloon", () => {
    expect(bowFor({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeGreaterThanOrEqual(48);
    expect(bowFor({ x: 0, y: 0 }, { x: 99999, y: 0 })).toBeLessThanOrEqual(220);
  });

  /** A card dragged to the left of its source needs a visible loop, not a kink. */
  it("bows further when the target sits behind the source", () => {
    const backward = bowFor({ x: 500, y: 0 }, { x: 100, y: 0 });
    const forward = bowFor({ x: 0, y: 0 }, { x: 400, y: 0 });
    expect(backward).toBeGreaterThan(forward);
  });
});

describe("buildWires", () => {
  const rects = { a: rect(0, 0), b: rect(400, 0), c: rect(800, 0) };

  it("draws a wire per connection", () => {
    const wires = buildWires(
      [
        { id: "1", from: "a", to: "b" },
        { id: "2", from: "b", to: "c" },
      ],
      rects,
    );
    expect(wires.map((w) => w.id)).toEqual(["1", "2"]);
  });

  /**
   * Cards report their size after mounting, so an unmeasured endpoint is
   * normal for a frame. Skipping beats drawing at a guessed position and
   * snapping.
   */
  it("skips a connection whose endpoint is not measured yet", () => {
    expect(buildWires([{ id: "1", from: "a", to: "missing" }], rects)).toEqual([]);
  });

  it("carries the muted flag through", () => {
    const [wire] = buildWires([{ id: "1", from: "a", to: "b", muted: true }], rects);
    expect(wire.muted).toBe(true);
  });

  it("defaults muted to false", () => {
    const [wire] = buildWires([{ id: "1", from: "a", to: "b" }], rects);
    expect(wire.muted).toBe(false);
  });
});

describe("wireBounds", () => {
  it("returns null with no wires", () => {
    expect(wireBounds([])).toBeNull();
  });

  it("covers every endpoint", () => {
    const wires = buildWires([{ id: "1", from: "a", to: "b" }], {
      a: rect(0, 0),
      b: rect(400, 300),
    });
    const bounds = wireBounds(wires)!;
    expect(bounds.x).toBe(200);
    expect(bounds.width).toBe(200);
  });
});
