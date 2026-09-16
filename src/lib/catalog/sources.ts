/**
 * Where real component models come from.
 *
 * Only these prefixes may be fetched. The proxy route builds its target from
 * this list rather than from anything the client sends, so the endpoint cannot
 * be pointed at an internal address.
 */
export const ALLOWED_MODEL_PREFIXES: readonly string[] = [
  "https://raw.githubusercontent.com/KiCad/kicad-packages3D/",
  "https://raw.githubusercontent.com/adafruit/Adafruit_CAD_Parts/",
] as const;

export function isAllowedModelUrl(url: string): boolean {
  return ALLOWED_MODEL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

const KICAD_BASE =
  "https://raw.githubusercontent.com/KiCad/kicad-packages3D/master/";

/**
 * KiCad VRML files are authored in 0.1-inch units, not millimetres.
 *
 * Verified empirically: SW_PUSH_6mm_H4.3mm measures 2.3622 raw units across its
 * body, and 2.3622 x 2.54 = 6.00 mm exactly. Without this factor every fetched
 * part would arrive 2.54x too small, which is precisely the kind of silent
 * scale error that makes a fit-check worthless.
 */
export const KICAD_UNIT_TO_MM = 2.54;

/**
 * KiCad models are authored Z-up; three.js here is Y-up.
 * Rotating -90 degrees about X puts a board flat on the ground plane.
 */
export const KICAD_X_ROTATION = -Math.PI / 2;

export function kicadModelUrl(relativePath: string): string {
  return `${KICAD_BASE}${relativePath}`;
}

/** Attribution required by the CC-BY-SA 4.0 licence on the KiCad libraries. */
export const KICAD_ATTRIBUTION =
  "3D models from the KiCad packages3D library, CC BY-SA 4.0";
