import { describe, expect, it } from "vitest";
import { composePrompt, isRenderable, EMPTY_SELECTION } from "./composePrompt";

describe("composePrompt", () => {
  it("puts the subject first, because early tokens carry the most weight", () => {
    const prompt = composePrompt({
      ...EMPTY_SELECTION,
      subject: "a desk lamp with a perforated base",
      materialId: "brushed-aluminium",
    });

    expect(prompt.startsWith("a desk lamp with a perforated base")).toBe(true);
    expect(prompt).toContain("brushed aluminium");
  });

  it("composes material, lighting and scene together", () => {
    const prompt = composePrompt({
      subject: "a speaker",
      materialId: "matte-black-plastic",
      lightingId: "dramatic-rim",
      sceneId: "marble-podium",
      extra: "",
    });

    expect(prompt).toContain("injection-moulded");
    expect(prompt).toContain("rim light");
    expect(prompt).toContain("marble podium");
  });

  it("skips presets that were not chosen", () => {
    const prompt = composePrompt({ ...EMPTY_SELECTION, subject: "a mug" });

    expect(prompt).not.toContain("undefined");
    expect(prompt).not.toContain(", ,");
  });

  it("ignores unknown preset ids rather than throwing", () => {
    const prompt = composePrompt({
      ...EMPTY_SELECTION,
      subject: "a mug",
      materialId: "does-not-exist",
    });

    expect(prompt).toContain("a mug");
  });

  it("always appends the photographic framing so output reads as a photo", () => {
    const prompt = composePrompt({ ...EMPTY_SELECTION, subject: "a chair" });
    expect(prompt).toContain("photorealistic product photograph");
  });

  it("appends the user's own words verbatim", () => {
    const prompt = composePrompt({
      ...EMPTY_SELECTION,
      subject: "a lamp",
      extra: "with a bright orange cable",
    });
    expect(prompt).toContain("with a bright orange cable");
  });

  it("falls back to a neutral subject rather than producing a leading comma", () => {
    const prompt = composePrompt(EMPTY_SELECTION);
    expect(prompt.startsWith(",")).toBe(false);
    expect(prompt).toContain("the product");
  });
});

describe("isRenderable", () => {
  it("requires a subject of at least three characters", () => {
    expect(isRenderable(EMPTY_SELECTION)).toBe(false);
    expect(isRenderable({ ...EMPTY_SELECTION, subject: "ab" })).toBe(false);
    expect(isRenderable({ ...EMPTY_SELECTION, subject: "mug" })).toBe(true);
  });

  it("does not count whitespace as a subject", () => {
    expect(isRenderable({ ...EMPTY_SELECTION, subject: "    " })).toBe(false);
  });
});
