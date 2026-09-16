import type { ImageSizePreset } from "./types";

/**
 * Output dimensions, as an aspect ratio plus a resolution tier.
 *
 * Kept separate on purpose. The aspect is a creative choice (a square feed post
 * vs a 9:16 story), while the resolution is a hardware one: SDXL wants ~1024px,
 * but SD 1.5 on a 6 GB card wants 512-768 and will either crawl or run out of
 * VRAM above that. Folding both into one list of presets would force the user
 * to rediscover that pairing for every aspect.
 */

/** Relative width/height for each aspect, before a resolution is applied. */
const ASPECTS: Record<ImageSizePreset, readonly [number, number]> = {
  square_hd: [1, 1],
  portrait_4_3: [4, 5],
  portrait_16_9: [9, 16],
  landscape_4_3: [4, 3],
  landscape_16_9: [16, 9],
};

export type Resolution = 512 | 768 | 1024;

export const RESOLUTIONS: readonly Resolution[] = [512, 768, 1024];

export const DEFAULT_RESOLUTION: Resolution = 1024;

/**
 * Diffusion models need dimensions divisible by 8, and ControlNet conditioning
 * lines up more cleanly on 64.
 */
const MULTIPLE = 64;

function roundToMultiple(value: number): number {
  return Math.max(MULTIPLE, Math.round(value / MULTIPLE) * MULTIPLE);
}

/**
 * Pixel dimensions for an aspect at a resolution tier.
 *
 * The tier sets the SHORTER side, so a 9:16 story at 512 does not become a
 * 288px-wide sliver, and every aspect carries a comparable amount of detail.
 */
export function dimensionsFor(
  preset: ImageSizePreset,
  resolution: Resolution = DEFAULT_RESOLUTION,
): readonly [number, number] {
  const [aw, ah] = ASPECTS[preset] ?? ASPECTS.square_hd;
  const scale = resolution / Math.min(aw, ah);
  return [roundToMultiple(aw * scale), roundToMultiple(ah * scale)];
}

/** Human label for a resolution tier, naming the model family it suits. */
export function resolutionLabel(resolution: Resolution): string {
  if (resolution === 512) return "512 - SD 1.5, fastest";
  if (resolution === 768) return "768 - balanced";
  return "1024 - SDXL, sharpest";
}

export function isResolution(value: number): value is Resolution {
  return RESOLUTIONS.includes(value as Resolution);
}
