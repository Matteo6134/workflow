import { describe, expect, it } from "vitest";
import { renderRequestSchema, publishRequestSchema } from "./render";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

const validRequest = {
  passes: { beauty: PNG, depth: PNG, normal: PNG, edge: PNG },
  settings: {
    prompt: "a matte black speaker on a marble podium",
    negativePrompt: "",
    shapeFidelity: 0.65,
    creativeFreedom: 0.85,
    steps: 35,
    guidance: 7.5,
    numImages: 2,
    imageSize: "square_hd" as const,
    resolution: 1024 as const,
  },
};

describe("renderRequestSchema", () => {
  it("accepts a well-formed request", () => {
    expect(renderRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("rejects a pass that is not an image data URL", () => {
    const result = renderRequestSchema.safeParse({
      ...validRequest,
      passes: { ...validRequest.passes, depth: "https://example.com/depth.png" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a prompt too short to steer the model", () => {
    const result = renderRequestSchema.safeParse({
      ...validRequest,
      settings: { ...validRequest.settings, prompt: "a" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects slider values outside 0..1", () => {
    for (const field of ["shapeFidelity", "creativeFreedom"] as const) {
      const result = renderRequestSchema.safeParse({
        ...validRequest,
        settings: { ...validRequest.settings, [field]: 1.5 },
      });
      expect(result.success, `${field} should be clamped to 0..1`).toBe(false);
    }
  });

  it("caps the batch size so a single click cannot run up a large bill", () => {
    const result = renderRequestSchema.safeParse({
      ...validRequest,
      settings: { ...validRequest.settings, numImages: 50 },
    });
    expect(result.success).toBe(false);
  });

  /**
   * Arbitrary sizes would break the multiple-of-64 rule the ControlNet
   * conditioning relies on, so only the offered tiers are accepted.
   */
  it("rejects a resolution outside the supported tiers", () => {
    const result = renderRequestSchema.safeParse({
      ...validRequest,
      settings: { ...validRequest.settings, resolution: 640 },
    });
    expect(result.success).toBe(false);
  });

  it("accepts each supported resolution tier", () => {
    for (const resolution of [512, 768, 1024]) {
      const result = renderRequestSchema.safeParse({
        ...validRequest,
        settings: { ...validRequest.settings, resolution },
      });
      expect(result.success, `resolution ${resolution}`).toBe(true);
    }
  });

  it("rejects an unknown image size preset", () => {
    const result = renderRequestSchema.safeParse({
      ...validRequest,
      settings: { ...validRequest.settings, imageSize: "panorama" },
    });
    expect(result.success).toBe(false);
  });
});

describe("publishRequestSchema", () => {
  it("requires a real URL, since Instagram fetches the media itself", () => {
    expect(
      publishRequestSchema.safeParse({ imageUrl: "not-a-url", caption: "" }).success,
    ).toBe(false);
  });

  it("enforces the 2200 character caption limit", () => {
    const result = publishRequestSchema.safeParse({
      imageUrl: "https://cdn.example.com/a.jpg",
      caption: "x".repeat(2201),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid post", () => {
    const result = publishRequestSchema.safeParse({
      imageUrl: "https://cdn.example.com/a.jpg",
      caption: "New product drop",
    });
    expect(result.success).toBe(true);
  });
});

describe("control pass contract", () => {
  it("requires the edge pass, which carries the geometry lock", () => {
    const { edge: _edge, ...withoutEdge } = validRequest.passes;
    const result = renderRequestSchema.safeParse({
      ...validRequest,
      passes: withoutEdge,
    });
    expect(result.success).toBe(false);
  });

  it("does not accept a mask pass, which must never leave the browser", () => {
    const result = renderRequestSchema.safeParse({
      ...validRequest,
      passes: { ...validRequest.passes, mask: PNG },
    });
    // Zod strips unknown keys rather than failing, so assert it was dropped.
    expect(result.success).toBe(true);
    expect(result.success && "mask" in result.data.passes).toBe(false);
  });
});
