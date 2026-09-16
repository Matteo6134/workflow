import { LIGHTING_PRESETS } from "./lighting";
import { MATERIAL_PRESETS } from "./materials";
import { SCENE_PRESETS } from "./scenes";
import { findPreset } from "./types";

/**
 * What the user actually chooses in the workbench. Everything except `subject`
 * is optional, so a render is possible after a single click.
 */
export type PromptSelection = {
  /** Plain description of the object, e.g. "a desk lamp with a perforated base". */
  readonly subject: string;
  readonly materialId: string | null;
  readonly lightingId: string | null;
  readonly sceneId: string | null;
  /** Free text appended verbatim, for anything the presets do not cover. */
  readonly extra: string;
};

export const EMPTY_SELECTION: PromptSelection = {
  subject: "",
  materialId: null,
  lightingId: null,
  sceneId: null,
  extra: "",
};

/** Appended to every prompt so output reads as a photograph, not a 3D render. */
const PHOTOGRAPHIC_SUFFIX =
  "photorealistic product photograph, shot on an 85mm lens, sharp focus, " +
  "physically accurate materials and reflections, high dynamic range, ultra detailed";

/**
 * Builds the final prompt from the user's picks.
 *
 * Order matters: subject first (the model weights early tokens most heavily),
 * then material, lighting, scene, the user's own words, and finally the
 * photographic framing.
 */
export function composePrompt(selection: PromptSelection): string {
  const subject = selection.subject.trim();

  const segments = [
    subject || "the product",
    findPreset(MATERIAL_PRESETS, selection.materialId)?.phrase,
    findPreset(LIGHTING_PRESETS, selection.lightingId)?.phrase,
    findPreset(SCENE_PRESETS, selection.sceneId)?.phrase,
    selection.extra.trim() || undefined,
    PHOTOGRAPHIC_SUFFIX,
  ];

  return segments
    .filter((segment): segment is string => Boolean(segment && segment.length))
    .join(", ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True once the selection can produce a meaningful render. */
export function isRenderable(selection: PromptSelection): boolean {
  return selection.subject.trim().length >= 3;
}
