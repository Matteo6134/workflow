import * as THREE from "three";

/**
 * STEP import via OpenCascade compiled to WebAssembly.
 *
 * STEP is what component vendors actually publish (Adafruit, Seeed, Arduino,
 * SnapEDA), and no browser can read it natively. This is the bridge, and it is
 * what makes real parts - with their real geometry and per-part colours -
 * available instead of stand-in boxes.
 *
 * The WASM payload is ~7 MB, so the module is imported lazily and cached: it is
 * only ever fetched if the user actually places a STEP-sourced component.
 */

import type { OcctMesh, OcctModule } from "occt-import-js";

let modulePromise: Promise<OcctModule> | null = null;

/** Loads and caches the WASM module. */
async function getOcct(): Promise<OcctModule> {
  if (!modulePromise) {
    modulePromise = import("occt-import-js").then((mod) =>
      // The .wasm is served from /public so the bundler never has to inline it.
      mod.default({ locateFile: (path) => `/occt/${path}` }),
    );
  }
  return modulePromise;
}

export class StepParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StepParseError";
  }
}

/**
 * Parses a STEP file into a three.js group, in millimetres.
 *
 * `linearUnit` is passed explicitly rather than relying on the file's own
 * header, so a part can never arrive at the wrong scale and quietly invalidate
 * a fit-check.
 */
export async function parseStep(buffer: ArrayBuffer): Promise<THREE.Group> {
  const occt = await getOcct();
  const result = occt.ReadStepFile(new Uint8Array(buffer), {
    linearUnit: "millimeter",
  });

  if (!result.success || result.meshes.length === 0) {
    throw new StepParseError("The STEP file could not be read");
  }

  const group = new THREE.Group();
  group.name = result.meshes[0]?.name ?? "STEP model";

  for (const mesh of result.meshes) {
    group.add(toMesh(mesh));
  }
  return group;
}

function toMesh(mesh: OcctMesh): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(Array.from(mesh.attributes.position.array), 3),
  );

  if (mesh.attributes.normal) {
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(Array.from(mesh.attributes.normal.array), 3),
    );
  }

  if (mesh.index) {
    geometry.setIndex(Array.from(mesh.index.array));
  }

  // Normals drive the normal control pass, so they must never be missing.
  if (!mesh.attributes.normal) geometry.computeVertexNormals();

  const [r, g, b] = mesh.color ?? [0.72, 0.74, 0.77];

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(r, g, b),
    // Dark, near-black parts read as PCB or plastic; bright warm tones as the
    // gold plating on pads and pins.
    metalness: isGold(r, g, b) ? 0.85 : 0.1,
    roughness: isGold(r, g, b) ? 0.32 : 0.55,
  });

  const result = new THREE.Mesh(geometry, material);
  result.name = mesh.name ?? "part";
  return result;
}

/** Gold plating is warm and bright; treating it as metal makes boards read right. */
function isGold(r: number, g: number, b: number): boolean {
  return r > 0.6 && g > 0.5 && b < 0.5 && r >= g && g > b;
}
