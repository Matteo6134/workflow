/** A named, human-friendly choice that contributes wording to the final prompt. */
export type Preset = {
  readonly id: string;
  readonly label: string;
  /** Short hint shown under the label in the picker. */
  readonly hint: string;
  /** The wording injected into the prompt. */
  readonly phrase: string;
};

export function findPreset(
  list: readonly Preset[],
  id: string | null,
): Preset | null {
  if (!id) return null;
  return list.find((p) => p.id === id) ?? null;
}
