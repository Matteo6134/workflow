import { describe, expect, it } from "vitest";
import {
  deltaToPixels,
  wheelIntent,
  zoomFactorFor,
  type WheelPathNode,
} from "./wheelTarget";

const plain: WheelPathNode = { isPanel: false, capturesWheel: false };
const scroller: WheelPathNode = { isPanel: false, capturesWheel: true };
const panel: WheelPathNode = { isPanel: true, capturesWheel: false };

const ctx = (over: Partial<Parameters<typeof wheelIntent>[0]> = {}) => ({
  ctrlKey: false,
  deltaY: -120,
  path: [],
  ...over,
});

describe("wheelIntent", () => {
  it("zooms over the bare board", () => {
    expect(wheelIntent(ctx())).toBe("zoom");
  });

  /** The reported bug: scrolling a preset list zoomed the whole board. */
  it("scrolls when an ancestor is a scroll container", () => {
    expect(wheelIntent(ctx({ path: [plain, scroller] }))).toBe("scroll");
  });

  /**
   * A scroller sitting at its top still captures an upward wheel. Chaining to
   * the board there made resting on a preset list zoom the whole board.
   */
  it("does not chain to zoom when a scroller is at its edge", () => {
    expect(wheelIntent(ctx({ deltaY: -180, path: [scroller] }))).toBe("scroll");
    expect(wheelIntent(ctx({ deltaY: 180, path: [scroller] }))).toBe("scroll");
  });

  it("scrolls over a floating panel even with nothing to scroll", () => {
    expect(wheelIntent(ctx({ path: [panel] }))).toBe("scroll");
  });

  /**
   * The regression this replaced: marking whole cards made object cards a dead
   * zone. A card with nothing scrollable under the cursor must still zoom.
   */
  it("zooms over a card that has nothing to scroll", () => {
    expect(wheelIntent(ctx({ path: [plain, plain, plain] }))).toBe("zoom");
  });

  it("zooms on ctrl+wheel even over a scroller, since that is a pinch", () => {
    expect(wheelIntent(ctx({ ctrlKey: true, path: [scroller] }))).toBe("zoom");
  });

  /** A sideways trackpad swipe reports deltaY === 0 and must not zoom out. */
  it("does nothing for a purely horizontal gesture", () => {
    expect(wheelIntent(ctx({ deltaY: 0 }))).toBe("scroll");
  });

  it("scrolls when a scroller sits anywhere in the path", () => {
    expect(wheelIntent(ctx({ path: [plain, plain, scroller, plain] }))).toBe("scroll");
  });
});

describe("deltaToPixels", () => {
  it("passes pixel deltas through", () => {
    expect(deltaToPixels(120, 0)).toBe(120);
  });

  it("converts line and page deltas", () => {
    expect(deltaToPixels(3, 1)).toBe(48);
    expect(deltaToPixels(1, 2)).toBe(800);
  });
});

describe("zoomFactorFor", () => {
  it("zooms in on a negative delta and out on a positive one", () => {
    expect(zoomFactorFor(-120)).toBeGreaterThan(1);
    expect(zoomFactorFor(120)).toBeLessThan(1);
  });

  /** Fixed-step zoom made trackpads rocket between the limits. */
  it("scales with the size of the gesture", () => {
    expect(zoomFactorFor(-200)).toBeGreaterThan(zoomFactorFor(-20));
  });

  it("is exactly reversible, so a gesture and its inverse cancel", () => {
    expect(zoomFactorFor(-120) * zoomFactorFor(120)).toBeCloseTo(1, 10);
  });

  it("caps a single event so one coarse notch cannot jump the range", () => {
    expect(zoomFactorFor(-100000)).toBeLessThanOrEqual(1.25);
    expect(zoomFactorFor(100000)).toBeGreaterThanOrEqual(1 / 1.25);
  });

  it("treats a line-mode delta as a bigger gesture than the same pixel value", () => {
    expect(zoomFactorFor(-3, 1)).toBeGreaterThan(zoomFactorFor(-3, 0));
  });
});
