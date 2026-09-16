import type * as THREE from "three";

export type ComponentCategory =
  | "board"
  | "display"
  | "light"
  | "power"
  | "input"
  | "connector";

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  board: "Boards",
  display: "Displays",
  light: "Lighting",
  power: "Power",
  input: "Controls",
  connector: "Connectors",
};

/** A numeric parameter the user can adjust before placing a generated part. */
export type ComponentParam = {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly defaultValue: number;
};

export type Dimensions = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

/**
 * Where a part's geometry comes from.
 *
 * "library" is the real manufacturer CAD model, with the actual board outline,
 * connectors and per-part colours. This is what a marketing render needs: a
 * stand-in box has the right footprint but the wrong silhouette, and the
 * silhouette is exactly what the edge pass locks the render to.
 *
 * "generated" is a dimensionally-accurate stand-in, used only where no openly
 * licensed model exists. It is labelled as such in the UI so the difference is
 * never hidden.
 */
export type ComponentSource =
  | {
      readonly kind: "library";
      readonly url: string;
      readonly attribution: string;
    }
  | { readonly kind: "generated" };

type ComponentBase = {
  readonly id: string;
  readonly name: string;
  readonly category: ComponentCategory;
  /** Nominal outer dimensions in mm. Library parts are re-measured on load. */
  readonly size: Dimensions;
  readonly summary: string;
  /** Where a fully detailed CAD model of this part can be obtained. */
  readonly reference?: string;
};

export type LibraryComponent = ComponentBase & {
  readonly source: Extract<ComponentSource, { kind: "library" }>;
};

export type GeneratedComponent = ComponentBase & {
  readonly source: Extract<ComponentSource, { kind: "generated" }>;
  readonly params?: readonly ComponentParam[];
  readonly build: (params: Readonly<Record<string, number>>) => THREE.Group;
};

export type ComponentSpec = LibraryComponent | GeneratedComponent;

export function isLibraryComponent(
  spec: ComponentSpec,
): spec is LibraryComponent {
  return spec.source.kind === "library";
}

export function defaultParams(spec: ComponentSpec): Record<string, number> {
  if (isLibraryComponent(spec)) return {};
  const entries = (spec.params ?? []).map((param) => [
    param.key,
    param.defaultValue,
  ]);
  return Object.fromEntries(entries);
}
