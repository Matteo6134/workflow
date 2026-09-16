import { describe, expect, it } from "vitest";
import {
  DEFAULT_RESOLUTION,
  RESOLUTIONS,
  dimensionsFor,
  isResolution,
} from "./imageSize";

describe("dimensionsFor", () => {
  it("returns a square at the requested resolution", () => {
    expect(dimensionsFor("square_hd", 512)).toEqual([512, 512]);
    expect(dimensionsFor("square_hd", 1024)).toEqual([1024, 1024]);
  });

  /** Diffusion needs /8; ControlNet conditioning lines up better on /64. */
  it.each(RESOLUTIONS)("keeps every dimension a multiple of 64 at %i", (res) => {
    for (const preset of [
      "square_hd",
      "portrait_4_3",
      "portrait_16_9",
      "landscape_4_3",
      "landscape_16_9",
    ] as const) {
      const [w, h] = dimensionsFor(preset, res);
      expect(w % 64, `${preset} width`).toBe(0);
      expect(h % 64, `${preset} height`).toBe(0);
    }
  });

  /**
   * The tier sets the SHORTER side, so a tall 9:16 crop still carries real
   * detail instead of collapsing to a sliver.
   */
  it("applies the resolution to the shorter side", () => {
    const [w, h] = dimensionsFor("portrait_16_9", 512);
    expect(Math.min(w, h)).toBe(512);
    expect(h).toBeGreaterThan(w);
  });

  it("keeps landscape wider than tall", () => {
    const [w, h] = dimensionsFor("landscape_16_9", 768);
    expect(w).toBeGreaterThan(h);
    expect(Math.min(w, h)).toBe(768);
  });

  it("scales with the tier", () => {
    const [smallW] = dimensionsFor("landscape_4_3", 512);
    const [bigW] = dimensionsFor("landscape_4_3", 1024);
    expect(bigW).toBeGreaterThan(smallW);
  });

  it("falls back to square for an unknown preset", () => {
    // @ts-expect-error - deliberately passing an invalid preset
    expect(dimensionsFor("nonsense", 512)).toEqual([512, 512]);
  });

  it("defaults to the SDXL tier", () => {
    expect(dimensionsFor("square_hd")).toEqual([
      DEFAULT_RESOLUTION,
      DEFAULT_RESOLUTION,
    ]);
  });
});

describe("isResolution", () => {
  it("accepts the supported tiers", () => {
    expect(isResolution(512)).toBe(true);
    expect(isResolution(1024)).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isResolution(640)).toBe(false);
    expect(isResolution(0)).toBe(false);
  });
});
