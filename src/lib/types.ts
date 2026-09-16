/**
 * Core domain types for the STL -> photoreal render -> publish pipeline.
 * All types are readonly: the app never mutates state in place.
 */

/** Image size presets accepted by the render backends. */
export type ImageSizePreset =
  | "square_hd"
  | "portrait_4_3"
  | "portrait_16_9"
  | "landscape_4_3"
  | "landscape_16_9";

/** Instagram feed posts are square or 4:5 portrait; this maps presets to that reality. */
export const INSTAGRAM_SAFE_SIZES: readonly ImageSizePreset[] = [
  "square_hd",
  "portrait_4_3",
] as const;

/**
 * The render passes captured from the 3D viewport. Each is a PNG data URL.
 *
 * - `beauty`  flat-shaded colour view, used as the img2img init image
 * - `depth`   linear depth encoded to greyscale, drives ControlNet depth
 * - `normal`  view-space normals, drives ControlNet normal
 * - `edge`    hidden-line drawing of real CAD edges, drives ControlNet canny
 * - `mask`    white silhouette on black; not sent to the model, used locally to
 *             verify the generated outline still matches the product
 *
 * Because these come from real geometry they are exact, unlike the estimated
 * depth and filtered edges a 2D-only tool has to infer from a picture.
 */
/** The passes actually sent to the model. */
export type ControlPasses = {
  readonly beauty: string;
  readonly depth: string;
  readonly normal: string;
  readonly edge: string;
};

/**
 * Everything captured locally. `mask` is deliberately NOT part of
 * {@link ControlPasses}: it never leaves the browser, so the type system stops
 * anyone adding several megabytes to each request by sending it.
 */
export type CapturePasses = ControlPasses & {
  readonly mask: string;
};

/** User-facing render controls. */
export type RenderSettings = {
  readonly prompt: string;
  readonly negativePrompt: string;
  /** 0..1 - how tightly the result hugs the source geometry (ControlNet scale). */
  readonly shapeFidelity: number;
  /** 0..1 - how far the result may drift from the flat viewport shading. */
  readonly creativeFreedom: number;
  readonly steps: number;
  readonly guidance: number;
  readonly numImages: number;
  /** Aspect ratio of the output. */
  readonly imageSize: ImageSizePreset;
  /** Pixel tier: 512/768 suit SD 1.5 on a small GPU, 1024 suits SDXL. */
  readonly resolution: 512 | 768 | 1024;
  readonly seed?: number;
};

/**
 * Split in two so the geometry-protection half is always applied and cannot be
 * accidentally deleted when a user edits the stylistic half.
 *
 * The second group is what keeps the model from redesigning the product:
 * without it, diffusion happily adds a vent, rounds a corner or restyles a
 * button, because those read as plausible product features.
 */
export const STYLE_NEGATIVE_PROMPT =
  "cgi look, clay, plastic toy, lowres, blurry, watermark, text, logo, " +
  "oversaturated, jpeg artifacts";

export const GEOMETRY_NEGATIVE_PROMPT =
  "changed shape, altered proportions, different dimensions, stretched, " +
  "distorted, warped, extra parts, missing parts, added buttons, added vents, " +
  "added seams, invented details, duplicated object, redesigned, " +
  "rounded edges that should be sharp, asymmetric";

export const DEFAULT_NEGATIVE_PROMPT = `${STYLE_NEGATIVE_PROMPT}, ${GEOMETRY_NEGATIVE_PROMPT}`;

/**
 * Defaults tuned for fidelity over flourish: a marketing render is useless if
 * it shows a product you cannot actually manufacture.
 */
export const DEFAULT_SETTINGS: RenderSettings = {
  prompt: "",
  negativePrompt: STYLE_NEGATIVE_PROMPT,
  shapeFidelity: 0.85,
  creativeFreedom: 0.72,
  steps: 35,
  guidance: 7,
  numImages: 2,
  imageSize: "square_hd",
  resolution: 1024,
};

/** A single generated image. */
export type RenderedImage = {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  /**
   * True when `url` is fetchable from the public internet.
   * Instagram's Content Publishing API can ONLY ingest public URLs, so a
   * render that is not publicly reachable must be re-hosted before publishing.
   */
  readonly publiclyReachable: boolean;
};

export type RenderOutput = {
  readonly images: readonly RenderedImage[];
  readonly seed: number;
  readonly backendId: string;
};
