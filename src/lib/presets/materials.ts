import type { Preset } from "./types";

/** Surface finishes. These carry most of the realism in a product render. */
export const MATERIAL_PRESETS: readonly Preset[] = [
  {
    id: "brushed-aluminium",
    label: "Brushed aluminium",
    hint: "Anodised metal, fine grain",
    phrase:
      "machined brushed aluminium with fine directional grain, anodised satin finish, " +
      "realistic soft metallic reflections and crisp chamfered edges",
  },
  {
    id: "matte-black-plastic",
    label: "Matte black plastic",
    hint: "Injection-moulded, soft touch",
    phrase:
      "matte black injection-moulded ABS plastic with a soft-touch finish, " +
      "subtle micro-texture, slight sheen at grazing angles, visible fine parting lines",
  },
  {
    id: "glossy-ceramic",
    label: "Glossy ceramic",
    hint: "Glazed, reflective",
    phrase:
      "glossy glazed ceramic with a deep clear coat, sharp mirror-like specular highlights, " +
      "smooth flawless surface",
  },
  {
    id: "frosted-glass",
    label: "Frosted glass",
    hint: "Translucent, diffused",
    phrase:
      "frosted translucent glass with realistic light diffusion and subsurface scattering, " +
      "soft internal glow, polished transparent edges",
  },
  {
    id: "matte-white",
    label: "Matte white",
    hint: "Minimal, Apple-like",
    phrase:
      "smooth matte white polymer with a minimal premium finish, " +
      "clean uninterrupted surfaces, subtle soft shading",
  },
  {
    id: "carbon-fibre",
    label: "Carbon fibre",
    hint: "Woven technical weave",
    phrase:
      "woven carbon fibre with a visible twill weave under a glossy clear coat, " +
      "technical high-performance finish, anisotropic highlights",
  },
  {
    id: "walnut-wood",
    label: "Walnut wood",
    hint: "Warm natural grain",
    phrase:
      "natural walnut wood with warm visible grain and an oiled satin finish, " +
      "organic tactile surface",
  },
  {
    id: "stainless-steel",
    label: "Polished steel",
    hint: "Mirror metal",
    phrase:
      "polished stainless steel with mirror-like reflections, " +
      "bright specular highlights, high-end metallic finish",
  },
] as const;
