import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * World units are MILLIMETRES throughout this app.
 *
 * Models are centred but never rescaled. That matters: the moment a 21 mm XIAO
 * is placed next to an enclosure, any normalisation would make one of them the
 * wrong size, and the fit-check - and the render - would be a lie. Framing is
 * handled by moving the camera, not by resizing the product.
 */
export type ModelUnit = "mm" | "cm" | "m" | "in";

/** Multiplier that converts each supported unit into millimetres. */
export const UNIT_TO_MM: Record<ModelUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
};

export type LoadedModel = {
  readonly object: THREE.Object3D;
  readonly triangleCount: number;
  /** True bounding box in millimetres. */
  readonly sourceDimensions: THREE.Vector3;
  readonly fileName: string;
};

export class ModelLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelLoadError";
  }
}

const SUPPORTED = [".stl", ".obj", ".glb", ".gltf"] as const;

export function isSupportedModel(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return SUPPORTED.some((ext) => lower.endsWith(ext));
}

export const SUPPORTED_EXTENSIONS = SUPPORTED.join(", ");

/**
 * Loads a model and centres it on the origin at its true physical size.
 *
 * `unit` converts the file's authoring units into millimetres. STL carries no
 * unit information at all, so this is a choice the user has to be able to make
 * rather than something that can be detected.
 */
export async function loadModel(
  file: File,
  unit: ModelUnit = "mm",
): Promise<LoadedModel> {
  if (!isSupportedModel(file.name)) {
    throw new ModelLoadError(
      `Unsupported file type. Use one of: ${SUPPORTED_EXTENSIONS}`,
    );
  }

  const buffer = await file.arrayBuffer();
  const object = await parseByExtension(file.name, buffer);

  const rawBox = new THREE.Box3().setFromObject(object);
  if (rawBox.isEmpty()) {
    throw new ModelLoadError("The file loaded but contains no visible geometry");
  }

  centreAtTrueScale(object, rawBox, UNIT_TO_MM[unit]);

  // Measured after conversion, so this is always real millimetres.
  const sourceDimensions = new THREE.Box3()
    .setFromObject(object)
    .getSize(new THREE.Vector3());

  return {
    object,
    triangleCount: countTriangles(object),
    sourceDimensions,
    fileName: file.name,
  };
}

async function parseByExtension(
  fileName: string,
  buffer: ArrayBuffer,
): Promise<THREE.Object3D> {
  const lower = fileName.toLowerCase();

  try {
    if (lower.endsWith(".stl")) {
      const geometry = new STLLoader().parse(buffer);
      // STL carries no normals of its own in ASCII form; compute when missing.
      if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
      return new THREE.Mesh(geometry, defaultMaterial());
    }

    if (lower.endsWith(".obj")) {
      const text = new TextDecoder().decode(buffer);
      const group = new OBJLoader().parse(text);
      applyDefaultMaterial(group);
      return group;
    }

    // .glb / .gltf
    const gltf = await new GLTFLoader().parseAsync(buffer, "");
    return gltf.scene;
  } catch (cause) {
    throw new ModelLoadError(
      `Could not read "${fileName}": ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
  }
}

/**
 * Centres the model on the origin at true physical size.
 *
 * The only scaling applied is the unit conversion - never a fit-to-view scale.
 * Mutates the freshly-parsed object, which is owned solely by this function and
 * has not yet been handed to the caller.
 */
function centreAtTrueScale(
  object: THREE.Object3D,
  box: THREE.Box3,
  unitScale: number,
): void {
  const center = box.getCenter(new THREE.Vector3());
  object.scale.setScalar(unitScale);
  object.position.set(
    -center.x * unitScale,
    -center.y * unitScale,
    -center.z * unitScale,
  );
}

function defaultMaterial(): THREE.Material {
  return new THREE.MeshStandardMaterial({
    color: 0xb8bcc2,
    roughness: 0.45,
    metalness: 0.1,
  });
}

function applyDefaultMaterial(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) child.material = defaultMaterial();
  });
}

function countTriangles(root: THREE.Object3D): number {
  let total = 0;
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geometry = child.geometry as THREE.BufferGeometry;
    const index = geometry.getIndex();
    const position = geometry.getAttribute("position");
    if (index) total += index.count / 3;
    else if (position) total += position.count / 3;
  });
  return Math.round(total);
}

/** Frees GPU memory when a model is replaced. */
export function disposeModel(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry?.dispose();
    const material = child.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
}
