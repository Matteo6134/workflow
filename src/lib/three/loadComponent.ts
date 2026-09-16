import * as THREE from "three";
import { VRMLLoader } from "three/examples/jsm/loaders/VRMLLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { parseStep } from "./loadStep";
import { KICAD_UNIT_TO_MM, KICAD_X_ROTATION } from "@/lib/catalog/sources";

/**
 * Fetches and parses a real component model from a public library.
 *
 * Every source has its own unit and axis convention, and getting either wrong
 * puts a part on the stage at the wrong size or lying on its side. Those
 * conventions are applied here, once, rather than being left to each caller.
 */

export type ComponentFormat = "step" | "wrl" | "stl" | "glb";

export class ComponentLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComponentLoadError";
  }
}

export function formatFromUrl(url: string): ComponentFormat | null {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".step") || path.endsWith(".stp")) return "step";
  if (path.endsWith(".wrl")) return "wrl";
  if (path.endsWith(".stl")) return "stl";
  if (path.endsWith(".glb") || path.endsWith(".gltf")) return "glb";
  return null;
}

/**
 * Loads a component by URL, going through the server proxy because the public
 * model hosts do not send usable CORS headers.
 */
export async function loadComponentFromUrl(url: string): Promise<THREE.Object3D> {
  const format = formatFromUrl(url);
  if (!format) {
    throw new ComponentLoadError(`Unsupported model format: ${url}`);
  }

  const response = await fetch(
    `/api/component-model?src=${encodeURIComponent(url)}`,
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new ComponentLoadError(
      detail.error ?? `Could not download the model (${response.status})`,
    );
  }

  const buffer = await response.arrayBuffer();
  const object = await parseByFormat(buffer, format);

  applySourceConventions(object, url, format);
  centreOnOrigin(object);
  return object;
}

async function parseByFormat(
  buffer: ArrayBuffer,
  format: ComponentFormat,
): Promise<THREE.Object3D> {
  try {
    switch (format) {
      case "step":
        return await parseStep(buffer);

      case "wrl": {
        const text = new TextDecoder().decode(buffer);
        return new VRMLLoader().parse(text, "");
      }

      case "stl": {
        const geometry = new STLLoader().parse(buffer);
        if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
        return new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            color: 0x9aa1aa,
            roughness: 0.5,
            metalness: 0.1,
          }),
        );
      }

      case "glb": {
        const gltf = await new GLTFLoader().parseAsync(buffer, "");
        return gltf.scene;
      }
    }
  } catch (cause) {
    throw new ComponentLoadError(
      `Could not parse the ${format.toUpperCase()} model: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
  }
}

/**
 * Applies per-source unit and axis conventions.
 *
 * KiCad VRML is authored in 0.1-inch units and Z-up. STEP is read as explicit
 * millimetres by the importer, but is also Z-up as CAD convention.
 */
function applySourceConventions(
  object: THREE.Object3D,
  url: string,
  format: ComponentFormat,
): void {
  if (format === "wrl") {
    object.scale.setScalar(KICAD_UNIT_TO_MM);
  }

  // Both CAD sources author Z-up; the viewport is Y-up.
  if (format === "wrl" || format === "step") {
    object.rotation.x = KICAD_X_ROTATION;
  }

  object.userData.sourceUrl = url;
}

/** Centres on X/Z and rests the part on y=0, which is how parts get placed. */
function centreOnOrigin(object: THREE.Object3D): void {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;

  const centre = box.getCenter(new THREE.Vector3());
  const wrapper = object;

  wrapper.position.x -= centre.x;
  wrapper.position.z -= centre.z;
  wrapper.position.y -= box.min.y;
}

/** Real millimetre dimensions of a loaded component, for display. */
export function measure(object: THREE.Object3D): THREE.Vector3 {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
}
