import type { Preset } from "./types";

/** Lighting setups, written the way a product photographer would light a set. */
export const LIGHTING_PRESETS: readonly Preset[] = [
  {
    id: "studio-softbox",
    label: "Studio softbox",
    hint: "Clean, even, catalogue-ready",
    phrase:
      "lit by a large softbox key light with a gentle fill and soft wraparound shadows, " +
      "professional product photography lighting, subtle gradient falloff",
  },
  {
    id: "dramatic-rim",
    label: "Dramatic rim",
    hint: "Dark, premium, high contrast",
    phrase:
      "dramatic low-key lighting with a bright rim light separating the product from a dark " +
      "background, strong specular highlights along the edges, deep controlled shadows",
  },
  {
    id: "golden-hour",
    label: "Golden hour",
    hint: "Warm natural sunlight",
    phrase:
      "warm golden hour sunlight raking across the product, long soft shadows, " +
      "natural window light, gentle warm colour temperature",
  },
  {
    id: "clean-white",
    label: "Clean white",
    hint: "E-commerce, shadowless",
    phrase:
      "bright even high-key lighting on a pure white seamless background, " +
      "almost shadowless, crisp e-commerce packshot lighting",
  },
  {
    id: "neon-tech",
    label: "Neon tech",
    hint: "Cyan/magenta gradient",
    phrase:
      "moody cinematic lighting with cyan and magenta neon gradient accents, " +
      "glowing coloured rim light, dark reflective surroundings",
  },
  {
    id: "daylight-desk",
    label: "Daylight desk",
    hint: "Natural lifestyle feel",
    phrase:
      "soft diffused daylight from a nearby window, natural realistic ambient occlusion, " +
      "relaxed lifestyle product photography",
  },
] as const;
