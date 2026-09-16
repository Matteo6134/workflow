import * as THREE from "three";

/**
 * Materials for the auxiliary render passes.
 *
 * Why a custom depth material instead of THREE.MeshDepthMaterial:
 * the built-in one writes *perspective* depth, which is heavily non-linear -
 * almost all of its range is spent in the first few centimetres in front of the
 * camera, leaving a distant product nearly flat white. ControlNet reads that as
 * weak structure. Normalising linearly between the model bounds instead spends
 * the full 0..1 range across the object, which is what makes the generated
 * render actually follow the geometry.
 */

const DEPTH_VERTEX = /* glsl */ `
  varying float vViewDepth;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    // Negated because the camera looks down -Z in view space.
    vViewDepth = -viewPosition.z;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const DEPTH_FRAGMENT = /* glsl */ `
  varying float vViewDepth;
  uniform float uNear;
  uniform float uFar;

  void main() {
    float normalized = (vViewDepth - uNear) / max(uFar - uNear, 0.0001);
    normalized = clamp(normalized, 0.0, 1.0);
    // ControlNet depth convention: near surfaces bright, far surfaces dark.
    float value = 1.0 - normalized;
    gl_FragColor = vec4(vec3(value), 1.0);
  }
`;

export type DepthRange = { readonly near: number; readonly far: number };

/**
 * Creates the linear depth material. `range` should bracket the model tightly -
 * use {@link depthRangeForObject} to derive it from the actual geometry.
 */
export function createDepthMaterial(range: DepthRange): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: DEPTH_VERTEX,
    fragmentShader: DEPTH_FRAGMENT,
    uniforms: {
      uNear: { value: range.near },
      uFar: { value: range.far },
    },
    side: THREE.DoubleSide,
  });
}

/** View-space normals as RGB, the format ControlNet normal expects. */
export function createNormalMaterial(): THREE.MeshNormalMaterial {
  return new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
}

/**
 * Computes a tight near/far bracket around the object as seen from the camera,
 * so the depth pass uses its full dynamic range on the product itself.
 */
export function depthRangeForObject(
  object: THREE.Object3D,
  camera: THREE.Camera,
): DepthRange {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return { near: 0.1, far: 10 };

  const cameraPosition = new THREE.Vector3();
  camera.getWorldPosition(cameraPosition);

  // Distance from the camera to the nearest and farthest bounding-box corners.
  const corners = boxCorners(box);
  let near = Infinity;
  let far = 0;

  for (const corner of corners) {
    const distance = corner.distanceTo(cameraPosition);
    near = Math.min(near, distance);
    far = Math.max(far, distance);
  }

  // A small margin stops the extreme surfaces clipping to pure black/white.
  const margin = Math.max((far - near) * 0.05, 0.001);
  return { near: Math.max(near - margin, 0.0001), far: far + margin };
}

function boxCorners(box: THREE.Box3): readonly THREE.Vector3[] {
  const { min, max } = box;
  return [
    new THREE.Vector3(min.x, min.y, min.z),
    new THREE.Vector3(min.x, min.y, max.z),
    new THREE.Vector3(min.x, max.y, min.z),
    new THREE.Vector3(min.x, max.y, max.z),
    new THREE.Vector3(max.x, min.y, min.z),
    new THREE.Vector3(max.x, min.y, max.z),
    new THREE.Vector3(max.x, max.y, min.z),
    new THREE.Vector3(max.x, max.y, max.z),
  ];
}
