import * as THREE from "three";
import { captureAllPasses } from "./capture";
import { frameObject } from "./framing";
import type { ViewDirection } from "./framing";
import type { CapturePasses } from "@/lib/types";

/**
 * Captures the control passes without a mounted viewport.
 *
 * On the board there is no live canvas, so capture builds its own short-lived
 * renderer and scene from the stored camera. This also removes a hidden
 * coupling: rendering no longer depends on the 3D editor being open, and the
 * passes come out identical either way.
 */

export type CameraState = {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly fov: number;
};

export type OffscreenCaptureInput = {
  /** Objects to include; callers pass only the visible ones. */
  readonly objects: readonly THREE.Object3D[];
  /** Null frames the scene automatically from an iso view. */
  readonly camera: CameraState | null;
  readonly width: number;
  readonly height: number;
};

export class CaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptureError";
  }
}

export function captureSceneOffscreen(
  input: OffscreenCaptureInput,
): CapturePasses {
  const { objects, camera: cameraState, width, height } = input;

  if (objects.length === 0) {
    throw new CaptureError("There is nothing on the stage to render");
  }

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    // captureAllPasses reads the buffer back with toDataURL.
    preserveDrawingBuffer: true,
  });

  // Objects are borrowed from wherever they live and returned afterwards.
  const origins = new Map<THREE.Object3D, THREE.Object3D | null>();

  try {
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(1);

    const scene = new THREE.Scene();
    addStudioLights(scene);

    const stage = new THREE.Group();
    for (const object of objects) {
      origins.set(object, object.parent);
      stage.add(object);
    }
    scene.add(stage);

    const camera = new THREE.PerspectiveCamera(
      cameraState?.fov ?? 40,
      width / height,
      1,
      100000,
    );

    if (cameraState) {
      camera.position.set(...cameraState.position);
      camera.lookAt(new THREE.Vector3(...cameraState.target));
    } else {
      const framing = frameObject(stage, camera, "iso");
      if (framing) {
        camera.position.copy(framing.position);
        camera.near = framing.near;
        camera.far = framing.far;
        camera.lookAt(framing.target);
      }
    }
    camera.updateProjectionMatrix();

    return captureAllPasses({
      gl: renderer,
      scene,
      camera,
      subject: stage,
      width,
      height,
    });
  } finally {
    // Put every borrowed object back before the temporary scene is discarded.
    for (const [object, parent] of origins) {
      if (parent) parent.add(object);
      else object.removeFromParent();
    }
    renderer.dispose();
    renderer.forceContextLoss();
  }
}

/**
 * Computes the camera for a named view without needing a mounted viewport.
 *
 * This is what lets the perspective be changed straight from a board card:
 * framing is pure geometry, so it does not require the 3D editor to be open.
 * Objects are borrowed and returned exactly as in {@link captureSceneOffscreen}.
 */
export function computeCameraState(
  objects: readonly THREE.Object3D[],
  direction: ViewDirection,
  aspect = 1,
): CameraState | null {
  if (objects.length === 0) return null;

  const origins = new Map<THREE.Object3D, THREE.Object3D | null>();
  const stage = new THREE.Group();

  try {
    for (const object of objects) {
      origins.set(object, object.parent);
      stage.add(object);
    }

    const camera = new THREE.PerspectiveCamera(40, aspect, 1, 100000);
    const framing = frameObject(stage, camera, direction);
    if (!framing) return null;

    return {
      position: [framing.position.x, framing.position.y, framing.position.z],
      target: [framing.target.x, framing.target.y, framing.target.z],
      fov: camera.fov,
    };
  } finally {
    for (const [object, parent] of origins) {
      if (parent) parent.add(object);
      else object.removeFromParent();
    }
  }
}

/** Matches the viewport lighting so the beauty pass is consistent. */
function addStudioLights(scene: THREE.Scene): void {
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(200, 260, 180);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.9);
  fill.position.set(-240, 120, -140);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(0, -160, 120);
  scene.add(rim);
}
