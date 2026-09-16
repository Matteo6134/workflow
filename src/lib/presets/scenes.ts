import type { Preset } from "./types";

/** Background / staging. Controls where the product appears to live. */
export const SCENE_PRESETS: readonly Preset[] = [
  {
    id: "seamless-studio",
    label: "Seamless studio",
    hint: "Infinite backdrop",
    phrase:
      "on a seamless neutral grey studio backdrop with a soft gradient, " +
      "shallow depth of field, nothing else in frame",
  },
  {
    id: "marble-podium",
    label: "Marble podium",
    hint: "Premium pedestal",
    phrase:
      "resting on a polished white marble podium with soft reflections, " +
      "minimal luxury product staging, clean negative space",
  },
  {
    id: "concrete",
    label: "Raw concrete",
    hint: "Industrial, textured",
    phrase:
      "on a raw polished concrete surface with subtle texture, " +
      "industrial minimal setting, muted tones",
  },
  {
    id: "lifestyle-desk",
    label: "Lifestyle desk",
    hint: "In-use context",
    phrase:
      "on a tidy modern wooden desk in a bright interior, softly blurred background, " +
      "realistic lifestyle context, shallow depth of field",
  },
  {
    id: "outdoor-nature",
    label: "Outdoor nature",
    hint: "Stone, moss, daylight",
    phrase:
      "outdoors on natural stone with moss and greenery softly blurred behind, " +
      "organic natural setting, realistic daylight",
  },
  {
    id: "pure-white",
    label: "Pure white",
    hint: "Cut-out packshot",
    phrase:
      "on a pure white background, isolated packshot with a soft contact shadow, " +
      "nothing else in frame",
  },
] as const;
