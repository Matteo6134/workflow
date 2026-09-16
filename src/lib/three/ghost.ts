import * as THREE from "three";

/**
 * X-ray / ghost shading, for showing the electronics inside an enclosure.
 *
 * This is more than a viewport effect, because a ghosted shell has to behave
 * differently in every pass:
 *
 *  - beauty  the shell is translucent, so the internals are visible
 *  - depth   the shell is SKIPPED, so the volume the model sees is the
 *            internals; leaving an opaque shell in would hide everything behind
 *            it and the render would show a sealed box
 *  - normal  skipped, for the same reason
 *  - edges   the shell still contributes its outline, but does NOT occlude, so
 *            internal component edges read through it
 *
 * Getting this wrong produces the classic failure: a "transparent" render that
 * is actually just a solid object with a faint tint.
 */
export const GHOST_FLAG = "isGhosted";

const GHOST_OPACITY = 0.22;

/** Marks an object as ghosted and swaps in translucent materials. */
export function applyGhost(root: THREE.Object3D): void {
  if (root.userData[GHOST_FLAG]) return;
  root.userData[GHOST_FLAG] = true;

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.userData.originalMaterial = child.material;
    child.material = ghostMaterialFrom(child.material);
    child.userData[GHOST_FLAG] = true;
  });
}

/** Restores the original opaque materials. */
export function clearGhost(root: THREE.Object3D): void {
  if (!root.userData[GHOST_FLAG]) return;
  delete root.userData[GHOST_FLAG];

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const original = child.userData.originalMaterial as
      | THREE.Material
      | THREE.Material[]
      | undefined;

    if (original) {
      disposeMaterial(child.material);
      child.material = original;
      delete child.userData.originalMaterial;
    }
    delete child.userData[GHOST_FLAG];
  });
}

function ghostMaterialFrom(
  source: THREE.Material | THREE.Material[],
): THREE.Material {
  const first = Array.isArray(source) ? source[0] : source;
  const color =
    first instanceof THREE.MeshStandardMaterial ? first.color.clone() : new THREE.Color(0xc8ccd2);

  return new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity: GHOST_OPACITY,
    roughness: 0.18,
    metalness: 0,
    // Without this the shell would z-fight with, and occlude, the internals.
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) material.forEach((m) => m.dispose());
  else material.dispose();
}

/**
 * Hides ghosted meshes for the passes that describe solid volume.
 * Returns a restore function.
 */
export function hideGhostedForVolumePasses(root: THREE.Object3D): () => void {
  const hidden: THREE.Object3D[] = [];

  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData[GHOST_FLAG] && child.visible) {
      hidden.push(child);
      child.visible = false;
    }
  });

  return () => {
    for (const mesh of hidden) mesh.visible = true;
  };
}

/** True when any part of the tree is currently ghosted. */
export function hasGhosted(root: THREE.Object3D): boolean {
  let found = false;
  root.traverse((child) => {
    if (child.userData[GHOST_FLAG]) found = true;
  });
  return found;
}
