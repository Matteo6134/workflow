import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { collectResources, isSafeToDispose } from "./disposal";

function meshWith(
  geometry = new THREE.BoxGeometry(1, 1, 1),
  material = new THREE.MeshStandardMaterial(),
): THREE.Mesh {
  return new THREE.Mesh(geometry, material);
}

describe("collectResources", () => {
  it("finds geometry and material on nested meshes", () => {
    const root = new THREE.Group();
    const child = new THREE.Group();
    child.add(meshWith());
    root.add(child);

    expect(collectResources(root).size).toBe(2);
  });

  it("returns nothing for an empty group", () => {
    expect(collectResources(new THREE.Group()).size).toBe(0);
  });
});

describe("isSafeToDispose", () => {
  it("allows disposal when nothing else is on the stage", () => {
    expect(isSafeToDispose(meshWith(), [])).toBe(true);
  });

  it("allows disposal when other items own separate resources", () => {
    expect(isSafeToDispose(meshWith(), [meshWith()])).toBe(true);
  });

  /**
   * The reason this exists: clone(true) shares geometry and materials, so
   * disposing one copy would blank out every other copy still on the stage.
   */
  it("refuses disposal when a clone shares the same geometry", () => {
    const original = meshWith();
    const copy = original.clone(true);
    expect(isSafeToDispose(original, [copy])).toBe(false);
  });

  it("refuses disposal when only the material is shared", () => {
    const material = new THREE.MeshStandardMaterial();
    const a = meshWith(new THREE.BoxGeometry(1, 1, 1), material);
    const b = meshWith(new THREE.BoxGeometry(2, 2, 2), material);
    expect(isSafeToDispose(a, [b])).toBe(false);
  });

  it("ignores the target appearing in its own others list", () => {
    const mesh = meshWith();
    expect(isSafeToDispose(mesh, [mesh])).toBe(true);
  });

  it("allows disposal of a group with no meshes", () => {
    expect(isSafeToDispose(new THREE.Group(), [meshWith()])).toBe(true);
  });
});
