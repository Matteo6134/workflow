import type { Preset } from "./types";

/**
 * Camera moves for the video/Reel step. These describe motion for an
 * image-to-video model, which animates the finished still render.
 */
export const ANIMATION_PRESETS: readonly Preset[] = [
  {
    id: "slow-orbit",
    label: "Slow orbit",
    hint: "Camera circles the product",
    phrase:
      "the camera slowly orbits around the product in a smooth arc, " +
      "the product stays perfectly still and centred, cinematic steady motion",
  },
  {
    id: "dolly-in",
    label: "Dolly in",
    hint: "Push toward the detail",
    phrase:
      "the camera slowly pushes in toward the product, gradually revealing surface detail, " +
      "smooth cinematic dolly movement, shallow depth of field",
  },
  {
    id: "turntable",
    label: "Turntable",
    hint: "Product rotates in place",
    phrase:
      "the product rotates slowly and smoothly on a turntable while the camera stays fixed, " +
      "even continuous rotation, product photography turntable",
  },
  {
    id: "light-sweep",
    label: "Light sweep",
    hint: "Highlight travels over it",
    phrase:
      "the camera holds still while a soft highlight sweeps slowly across the product surface, " +
      "revealing material and reflections, subtle elegant motion",
  },
  {
    id: "hero-rise",
    label: "Hero rise",
    hint: "Tilt up reveal",
    phrase:
      "the camera slowly rises and tilts down toward the product in a heroic reveal, " +
      "smooth crane movement, dramatic product introduction",
  },
] as const;
