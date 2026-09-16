import { BOARD_PARTS } from "./boards";
import { DISPLAY_PARTS } from "./displays";
import { HARDWARE_PARTS } from "./hardware";
import { LIBRARY_PARTS } from "./realParts";
import type { ComponentCategory, ComponentSpec } from "./types";

/**
 * The full catalogue.
 *
 * Real manufacturer models come first in each category: they carry the true
 * board outline, connectors and colours, which is what a marketing render needs.
 * The generated parts that follow cover the gaps where no openly licensed model
 * exists (the LCD1602 and the classic Arduino boards, among others), and the UI
 * labels them so the difference is never hidden.
 */
export const CATALOG: readonly ComponentSpec[] = [
  ...LIBRARY_PARTS,
  ...BOARD_PARTS,
  ...DISPLAY_PARTS,
  ...HARDWARE_PARTS,
];

export function findComponent(id: string): ComponentSpec | null {
  return CATALOG.find((spec) => spec.id === id) ?? null;
}

export function componentsByCategory(): ReadonlyMap<
  ComponentCategory,
  readonly ComponentSpec[]
> {
  const grouped = new Map<ComponentCategory, ComponentSpec[]>();
  for (const spec of CATALOG) {
    const existing = grouped.get(spec.category);
    if (existing) existing.push(spec);
    else grouped.set(spec.category, [spec]);
  }
  return grouped;
}

export { CATEGORY_LABELS, defaultParams, isLibraryComponent } from "./types";
export type {
  ComponentCategory,
  ComponentParam,
  ComponentSpec,
  Dimensions,
  GeneratedComponent,
  LibraryComponent,
} from "./types";
