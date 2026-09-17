import * as THREE from "three";
import type { CapturePasses, ImageSizePreset } from "@/lib/types";
import {
  DEFAULT_RESOLUTION,
  dimensionsFor,
  type Resolution,
} from "@/lib/imageSize";
import {
  createDepthMaterial,
  createNormalMaterial,
  depthRangeForObject,
} from "./passes";
import { buildEdgeOverlay, createMaskMaterial, occludeSurfaces } from "./edges";
import { shouldHideDuringCapture } from "./captureScope";

/**
 * Objects flagged this way (grids, gizmos, helpers) are hidden during capture
 * so they never leak into the passes sent to the model.
 */
export const HELPER_FLAG = "isViewportHelper";

export type CaptureOptions = {
  readonly gl: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  /** The imported model; bounds the depth range and supplies the edge lines. */
  readonly subject: THREE.Object3D;
  readonly width: number;
  readonly height: number;
};

/**
 * Renders every control pass at the exact output resolution.
 *
 * The renderer is resized to the target dimensions first so the passes match
 * the generated image pixel for pixel. Capturing at the on-screen viewport size
 * and letting the backend rescale would soften the depth and edge maps - and a
 * soft control map is precisely what lets a diffusion model drift away from the
 * real dimensions of the product.
 *
 * Requires a WebGL context created with `preserveDrawingBuffer: true`,
 * otherwise the buffer is cleared before `toDataURL` can read it.
 */
export function captureAllPasses(options: CaptureOptions): CapturePasses {
  const { gl, scene, camera, subject, width, height } = options;

  const restoreViewport = suspendViewport(options);
  const depthMaterial = createDepthMaterial(depthRangeForObject(subject, camera));
  const normalMaterial = createNormalMaterial();
  const maskMaterial = createMaskMaterial();
  const edges = buildEdgeOverlay(subject);

  try {
    gl.setPixelRatio(1);
    gl.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Beauty: neutral mid-grey surround gives img2img a clean start without
    // tinting the lighting the model is asked to invent.
    scene.background = new THREE.Color(0x808080);
    scene.overrideMaterial = null;
    // JPEG here: the init image only needs to convey colour and shading, and
    // four lossless 1024px passes would otherwise make every request ~8 MB.
    const beauty = renderToDataUrl(gl, scene, camera, "image/jpeg", 0.92);

    // Control passes: black reads as "infinitely far" / "no surface".
    scene.background = new THREE.Color(0x000000);

    scene.overrideMaterial = depthMaterial;
    const depth = renderToDataUrl(gl, scene, camera);

    scene.overrideMaterial = normalMaterial;
    const normal = renderToDataUrl(gl, scene, camera);

    scene.overrideMaterial = maskMaterial;
    const mask = renderToDataUrl(gl, scene, camera);

    const edge = renderEdgePass(options, edges.group);

    return { beauty, depth, normal, edge, mask };
  } finally {
    depthMaterial.dispose();
    normalMaterial.dispose();
    maskMaterial.dispose();
    edges.dispose();
    restoreViewport();
  }
}

/**
 * Hidden-line pass. Surfaces are painted flat black so they occlude the lines
 * behind them, which is what makes this a technical line drawing rather than a
 * see-through wireframe.
 */
function renderEdgePass(
  options: CaptureOptions,
  edgeGroup: THREE.Group,
): string {
  const { gl, scene, camera, subject } = options;

  // overrideMaterial cannot be used here: it would flatten the white lines too.
  scene.overrideMaterial = null;
  const restoreSurfaces = occludeSurfaces(subject);
  scene.add(edgeGroup);

  try {
    return renderToDataUrl(gl, scene, camera);
  } finally {
    scene.remove(edgeGroup);
    restoreSurfaces();
  }
}

/**
 * Control passes stay PNG on purpose: JPEG ringing around the hard edges of a
 * depth or line map reads as real geometry to ControlNet and softens exactly
 * the structure we are trying to lock down.
 */
function renderToDataUrl(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  type: "image/png" | "image/jpeg" = "image/png",
  quality?: number,
): string {
  gl.render(scene, camera);
  return gl.domElement.toDataURL(type, quality);
}

/**
 * Snapshots everything capture mutates and returns a function that restores it.
 * Capture borrows the live viewport, so leaving any of this changed would
 * visibly corrupt the user's scene.
 *
 * Editor furniture is excluded by WHITELIST, not by blacklist: at the scene
 * root only the stage and the lights survive. A blacklist has to know every
 * kind of helper that might exist, and the first one it does not know about
 * silently ends up in the control passes - which is exactly how a transform
 * gizmo's axis arrows got conditioned into renders before this was fixed.
 */
function suspendViewport(options: CaptureOptions): () => void {
  const { gl, scene, camera, subject } = options;

  const previousSize = gl.getSize(new THREE.Vector2());
  const previousPixelRatio = gl.getPixelRatio();
  const previousAspect = camera.aspect;
  const previousBackground = scene.background;
  const previousOverride = scene.overrideMaterial;

  const stageRoot = topLevelAncestor(scene, subject);
  const hidden: THREE.Object3D[] = [];

  const hide = (object: THREE.Object3D) => {
    if (!object.visible) return;
    hidden.push(object);
    object.visible = false;
  };

  for (const child of scene.children) {
    const hideIt = shouldHideDuringCapture({
      isStageRoot: child === stageRoot,
      // Lights carry no pixels of their own but the beauty pass needs them.
      isLight: Boolean((child as THREE.Light).isLight),
      isFlaggedHelper: Boolean(child.userData[HELPER_FLAG]),
    });
    if (hideIt) hide(child);
  }

  // Anything explicitly flagged, wherever it sits in the tree.
  scene.traverse((object) => {
    if (object.userData[HELPER_FLAG]) hide(object);
  });

  return () => {
    for (const object of hidden) object.visible = true;
    scene.background = previousBackground;
    scene.overrideMaterial = previousOverride;
    gl.setPixelRatio(previousPixelRatio);
    gl.setSize(previousSize.x, previousSize.y, false);
    camera.aspect = previousAspect;
    camera.updateProjectionMatrix();
  };
}

/** Walks up from `object` to the child of `scene` that contains it. */
function topLevelAncestor(
  scene: THREE.Scene,
  object: THREE.Object3D,
): THREE.Object3D {
  let current = object;
  while (current.parent && current.parent !== scene) {
    current = current.parent;
  }
  return current;
}

/**
 * Capture dimensions, taken from the shared table so the control passes always
 * match the generated image exactly.
 *
 * A mismatch here would make the backend rescale them, softening the very edges
 * the geometry lock depends on — so both sides read the same function.
 */
export function captureSizeFor(
  preset: ImageSizePreset,
  resolution: Resolution = DEFAULT_RESOLUTION,
): readonly [number, number] {
  return dimensionsFor(preset, resolution);
}
