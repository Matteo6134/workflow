import * as THREE from "three";

/**
 * Camera framing for a scene measured in real millimetres.
 *
 * Because models keep their true size, a 20 mm sensor housing and a 300 mm
 * enclosure are wildly different scales. Rather than resizing the product to
 * suit the camera, the camera is moved to suit the product - the only approach
 * that keeps placed components dimensionally honest.
 */

export type ViewDirection =
  | "front"
  | "back"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "iso";

/** Unit vectors pointing from the target toward the camera. */
const DIRECTIONS: Record<ViewDirection, readonly [number, number, number]> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  right: [1, 0, 0],
  left: [-1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
  iso: [0.78, 0.55, 0.9],
};

export const VIEW_LABELS: Record<ViewDirection, string> = {
  front: "Front",
  back: "Back",
  left: "Left",
  right: "Right",
  top: "Top",
  bottom: "Bottom",
  iso: "Iso",
};

export type Framing = {
  readonly position: THREE.Vector3;
  readonly target: THREE.Vector3;
  readonly near: number;
  readonly far: number;
};

/**
 * Computes a camera placement that fits `object` in view from `direction`.
 *
 * `padding` (1 = tight) leaves breathing room so the product does not touch the
 * frame edge, which reads badly in a marketing image.
 */
export function frameObject(
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  direction: ViewDirection = "iso",
  padding = 1.35,
): Framing | null {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return null;

  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 0.001);

  // Fit against the tighter of the two frustum axes so nothing is cropped.
  const vFov = (camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const distance = (radius * padding) / Math.sin(Math.min(vFov, hFov) / 2);

  const offset = new THREE.Vector3(...DIRECTIONS[direction])
    .normalize()
    .multiplyScalar(distance);

  return {
    position: sphere.center.clone().add(offset),
    target: sphere.center.clone(),
    // Clip planes scale with the subject, so a 20 mm part and a 500 mm
    // enclosure both get usable depth precision.
    near: Math.max(distance - radius * 4, radius / 100),
    far: distance + radius * 8,
  };
}

/** Applies a framing to the camera and, when present, the orbit target. */
export function applyFraming(
  framing: Framing,
  camera: THREE.PerspectiveCamera,
  controls?: { target: THREE.Vector3; update: () => void } | null,
): void {
  camera.position.copy(framing.position);
  camera.near = framing.near;
  camera.far = framing.far;
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.copy(framing.target);
    controls.update();
  } else {
    camera.lookAt(framing.target);
  }
}

/** A grid spacing that stays readable whatever the size of the product. */
export function gridSpacingFor(object: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return 10;

  const size = box.getSize(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z);

  // Round to a familiar engineering step (1, 2, 5, 10, 20, 50 mm...).
  const rough = largest / 10;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 0.001)));
  const normalized = rough / magnitude;
  const step = normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10;
  return step * magnitude;
}
