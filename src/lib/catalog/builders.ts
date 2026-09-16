import * as THREE from "three";

/**
 * Primitives for assembling catalogue parts.
 *
 * Everything is in millimetres and positioned so that y=0 is the bottom of the
 * part. Placing a component on a surface is then just setting its y to that
 * surface, which is how someone laying out internals actually thinks.
 */

export const MATERIALS = {
  pcbGreen: () => standard(0x0d5c3f, 0.72, 0),
  pcbBlack: () => standard(0x14161a, 0.66, 0),
  pcbBlue: () => standard(0x123a6b, 0.7, 0),
  pcbWhite: () => standard(0xe8e8e4, 0.74, 0),
  chip: () => standard(0x16181c, 0.55, 0),
  metal: () => standard(0xb9bec6, 0.32, 0.9),
  gold: () => standard(0xc9a227, 0.38, 0.85),
  glass: () => standard(0x0a0c10, 0.16, 0.1),
  plastic: (color: number) => standard(color, 0.62, 0),
  cell: () => standard(0x9aa3ad, 0.38, 0.75),
} as const;

function standard(
  color: number,
  roughness: number,
  metalness: number,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/** A box whose base sits at `y`, centred on x/z unless offset. */
export function box(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  position: { x?: number; y?: number; z?: number } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material,
  );
  mesh.position.set(
    position.x ?? 0,
    (position.y ?? 0) + height / 2,
    position.z ?? 0,
  );
  return mesh;
}

/** A cylinder standing on its base at `y`. */
export function cylinder(
  radius: number,
  height: number,
  material: THREE.Material,
  position: { x?: number; y?: number; z?: number } = {},
  segments = 32,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, segments),
    material,
  );
  mesh.position.set(
    position.x ?? 0,
    (position.y ?? 0) + height / 2,
    position.z ?? 0,
  );
  return mesh;
}

/** An emissive panel, used for lit display areas and LEDs. */
export function emissivePanel(
  width: number,
  depth: number,
  color: number,
  intensity: number,
  position: { x?: number; y?: number; z?: number } = {},
): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.4,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
  return mesh;
}

/** A row of header pins along the X axis. */
export function pinHeader(
  count: number,
  material: THREE.Material,
  position: { x?: number; y?: number; z?: number } = {},
  pitch = 2.54,
): THREE.Group {
  const group = new THREE.Group();
  const span = (count - 1) * pitch;

  for (let index = 0; index < count; index += 1) {
    group.add(
      box(0.64, 2.5, 0.64, material, {
        x: -span / 2 + index * pitch,
        y: 0,
      }),
    );
  }

  group.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
  return group;
}

/** A USB-C receptacle shell (8.94 x 3.26 mm opening, per the spec). */
export function usbCPort(
  material: THREE.Material,
  position: { x?: number; y?: number; z?: number } = {},
): THREE.Mesh {
  return box(8.94, 3.26, 7.35, material, position);
}

/** Micro-USB receptacle (7.5 x 2.8 mm). */
export function microUsbPort(
  material: THREE.Material,
  position: { x?: number; y?: number; z?: number } = {},
): THREE.Mesh {
  return box(7.5, 2.8, 5.9, material, position);
}

/** Wraps children in a named group and tags it so it reads well in the UI. */
export function assemble(name: string, ...parts: THREE.Object3D[]): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  for (const part of parts) group.add(part);
  return group;
}
