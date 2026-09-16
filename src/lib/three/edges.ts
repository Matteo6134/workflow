import * as THREE from "three";
import { GHOST_FLAG } from "./ghost";

/**
 * Builds a true hidden-line drawing of the model.
 *
 * This is the strongest defence against the model altering your product.
 * Depth and normal passes describe *form*, but they are smooth and let a
 * diffusion model quietly round a corner, thicken a wall or shift a proportion.
 * A crisp line drawing of the real CAD edges, fed to the ControlNet canny
 * input with preprocessing disabled, pins the silhouette and every hard edge to
 * the geometry you actually designed.
 *
 * Edges are extracted with EdgesGeometry, so they come from the mesh topology -
 * not from an edge filter run over a picture, which is what a 2D tool is
 * limited to and which invents and drops lines.
 */

/** Angle (degrees) above which a shared edge counts as a visible crease. */
const CREASE_ANGLE = 20;

export type EdgeOverlay = {
  /** White line segments, ready to add to the scene. */
  readonly group: THREE.Group;
  readonly dispose: () => void;
};

export function buildEdgeOverlay(subject: THREE.Object3D): EdgeOverlay {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const material = new THREE.LineBasicMaterial({ color: 0xffffff });
  disposables.push(material);

  subject.updateWorldMatrix(true, true);

  subject.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const geometry = new THREE.EdgesGeometry(
      child.geometry as THREE.BufferGeometry,
      CREASE_ANGLE,
    );
    disposables.push(geometry);

    const lines = new THREE.LineSegments(geometry, material);
    // Bake the mesh's world transform so the overlay sits exactly on the model.
    lines.applyMatrix4(child.matrixWorld);
    lines.matrixAutoUpdate = false;
    group.add(lines);
  });

  return {
    group,
    dispose: () => {
      for (const item of disposables) item.dispose();
      group.clear();
    },
  };
}

/**
 * Hides the surfaces behind flat black while the line overlay is drawn, giving
 * proper hidden-line removal: edges on the far side of the product are
 * correctly occluded instead of showing through as a wireframe.
 *
 * Returns a restore function; `scene.overrideMaterial` cannot be used here
 * because it would also flatten the white lines to black.
 */
export function occludeSurfaces(subject: THREE.Object3D): () => void {
  const blackout = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

  subject.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    // A ghosted shell must not occlude: the whole point of an X-ray view is
    // that the edges of the components inside read through it.
    if (child.userData[GHOST_FLAG]) return;
    originals.set(child, child.material);
    child.material = blackout;
  });

  return () => {
    for (const [mesh, material] of originals) mesh.material = material;
    blackout.dispose();
  };
}

/** Flat white silhouette on black, used to verify the outline did not move. */
export function createMaskMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });
}
