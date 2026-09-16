import * as THREE from "three";
import { frameObject } from "./framing";

/**
 * Renders a one-off preview image of an object for its board card.
 *
 * Uses its own short-lived renderer rather than borrowing the editor's canvas,
 * so a card can get a thumbnail whether or not the 3D editor is currently open.
 * The renderer is disposed immediately: WebGL contexts are a limited resource
 * and browsers drop the oldest once roughly sixteen are alive.
 */
export function renderThumbnail(
  object: THREE.Object3D,
  size = 320,
): string | null {
  let renderer: THREE.WebGLRenderer | null = null;

  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(size, size, false);
    renderer.setPixelRatio(1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100000);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(1, 1.4, 1.1);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.7);
    fill.position.set(-1.2, 0.5, -0.8);
    scene.add(fill);

    // The object stays in the editor scene, so it is only borrowed: its
    // original parent is restored before this function returns.
    const previousParent = object.parent;
    scene.add(object);

    const framing = frameObject(object, camera, "iso", 1.25);
    if (framing) {
      camera.position.copy(framing.position);
      camera.near = framing.near;
      camera.far = framing.far;
      camera.lookAt(framing.target);
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL("image/png");

    if (previousParent) previousParent.add(object);
    else scene.remove(object);

    return dataUrl;
  } catch {
    // A thumbnail is a nicety; never let it break importing a model.
    return null;
  } finally {
    renderer?.dispose();
    renderer?.forceContextLoss();
  }
}
