import type * as THREE from "three";

/** How an object entered the scene, which drives the icon and default naming. */
export type SceneItemKind = "product" | "component";

export type Vec3 = { readonly x: number; readonly y: number; readonly z: number };

export const ZERO: Vec3 = { x: 0, y: 0, z: 0 };
export const ONE: Vec3 = { x: 1, y: 1, z: 1 };

/**
 * One object on the stage: the imported product, or an electronics part placed
 * alongside it.
 *
 * The three.js object is held by reference because it owns GPU resources and
 * cannot be cloned cheaply, but every value the UI edits (transform, name,
 * visibility) is plain immutable data. That split keeps undo, inspection and
 * re-render predictable while still driving a live WebGL scene.
 */
export type SceneItem = {
  readonly id: string;
  readonly name: string;
  readonly kind: SceneItemKind;
  readonly object: THREE.Object3D;
  readonly visible: boolean;
  /** X-ray shading, so the parts inside an enclosure are visible. */
  readonly ghosted: boolean;
  /** Rotation is stored in degrees - what the user types in the panel. */
  readonly position: Vec3;
  readonly rotation: Vec3;
  readonly scale: Vec3;
  /** Unit the source file was interpreted as. Only meaningful for products. */
  readonly unit: "mm" | "cm" | "m" | "in";
  /** Source dimensions in millimetres, for display only. */
  readonly dimensionsMm: Vec3 | null;
  /** Rendered preview for the board card; null if the render failed. */
  readonly thumbnail: string | null;
  readonly triangleCount: number;
};

export type SceneState = {
  readonly items: readonly SceneItem[];
  readonly selectedId: string | null;
};

export const EMPTY_SCENE: SceneState = { items: [], selectedId: null };

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ---------------------------------------------------------------------------
 * Immutable operations. Each returns a new SceneState; none mutates its input,
 * so React sees a genuine change and history/undo stays trivial to add.
 * ------------------------------------------------------------------------ */

export function addItem(state: SceneState, item: SceneItem): SceneState {
  return { items: [...state.items, item], selectedId: item.id };
}

export function removeItem(state: SceneState, id: string): SceneState {
  const items = state.items.filter((item) => item.id !== id);
  return {
    items,
    selectedId: state.selectedId === id ? null : state.selectedId,
  };
}

export function selectItem(state: SceneState, id: string | null): SceneState {
  return { ...state, selectedId: id };
}

export function updateItem(
  state: SceneState,
  id: string,
  patch: Partial<Omit<SceneItem, "id" | "object">>,
): SceneState {
  return {
    ...state,
    items: state.items.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    ),
  };
}

export function findItem(state: SceneState, id: string | null): SceneItem | null {
  if (!id) return null;
  return state.items.find((item) => item.id === id) ?? null;
}

/** The product is the anchor for framing and depth bracketing. */
export function findProduct(state: SceneState): SceneItem | null {
  return state.items.find((item) => item.kind === "product") ?? null;
}

export function hasRenderableContent(state: SceneState): boolean {
  return state.items.some((item) => item.visible);
}
