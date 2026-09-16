import * as THREE from "three";

/**
 * Decides whether an object's GPU resources may be freed.
 *
 * Duplicating a part clones the object tree but SHARES geometry and material
 * instances - that is what makes duplication cheap. Disposing one copy would
 * then blank out every other copy still on the stage, so disposal only happens
 * once nothing else references those resources.
 */

/** Collects every geometry and material reachable from an object. */
export function collectResources(root: THREE.Object3D): Set<unknown> {
  const resources = new Set<unknown>();

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.geometry) resources.add(child.geometry);
    const material = child.material;
    if (Array.isArray(material)) material.forEach((m) => resources.add(m));
    else if (material) resources.add(material);
  });

  return resources;
}

/**
 * True when nothing in `others` shares a geometry or material with `target`,
 * so disposing it is safe.
 */
export function isSafeToDispose(
  target: THREE.Object3D,
  others: readonly THREE.Object3D[],
): boolean {
  const mine = collectResources(target);
  if (mine.size === 0) return true;

  for (const other of others) {
    if (other === target) continue;
    for (const resource of collectResources(other)) {
      if (mine.has(resource)) return false;
    }
  }
  return true;
}
