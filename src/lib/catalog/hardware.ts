import * as THREE from "three";
import { MATERIALS, assemble, box, cylinder, emissivePanel } from "./builders";
import type { GeneratedComponent } from "./types";

/**
 * Lighting, power and control hardware.
 *
 * The LED strips are parametric because strip length is a layout decision, not
 * a fixed part: a strip is cut to fit the enclosure, and seeing the real LED
 * count and pitch at the real length is the whole point of placing one.
 */

const STRIP_PARAMS = [
  {
    key: "length",
    label: "Strip length",
    unit: "mm",
    min: 10,
    max: 1000,
    step: 5,
    defaultValue: 100,
  },
  {
    key: "density",
    label: "LEDs per metre",
    unit: "/m",
    min: 30,
    max: 144,
    step: 1,
    defaultValue: 60,
  },
] as const;

/** Builds a strip of `width` mm running along the Z axis. */
function buildStrip(
  width: number,
  params: Readonly<Record<string, number>>,
  ledSize: number,
): THREE.Group {
  const length = Math.max(params.length ?? 100, 10);
  const density = Math.max(params.density ?? 60, 1);

  const pcb = box(width, 1.0, length, MATERIALS.pcbWhite());
  const group = assemble("LED strip", pcb);

  const pitch = 1000 / density;
  const count = Math.max(Math.floor(length / pitch), 1);
  // Centre the run so the strip stays symmetrical about its own origin.
  const span = (count - 1) * pitch;

  for (let index = 0; index < count; index += 1) {
    const z = -span / 2 + index * pitch;
    group.add(
      box(ledSize, 1.6, ledSize, MATERIALS.plastic(0xf2f2f2), { y: 1.0, z }),
    );
    group.add(
      emissivePanel(ledSize * 0.72, ledSize * 0.72, 0xfff2d0, 2.2, {
        y: 2.65,
        z,
      }),
    );
  }

  return group;
}

export const HARDWARE_PARTS: readonly GeneratedComponent[] = [
  {
    id: "led-strip-ws2812b",
    name: "WS2812B strip (10 mm)",
    category: "light",
    source: { kind: "generated" },
    size: { x: 10, y: 2.6, z: 100 },
    summary: "Addressable 5050 RGB strip on 10 mm PCB. Cut to any length.",
    params: STRIP_PARAMS,
    build: (params) => buildStrip(10, params, 5),
  },

  {
    id: "led-strip-narrow",
    name: "LED strip (5 mm narrow)",
    category: "light",
    source: { kind: "generated" },
    size: { x: 5, y: 2.2, z: 100 },
    summary: "Narrow 2020-package strip for slim channels and edge lighting.",
    params: STRIP_PARAMS,
    build: (params) => buildStrip(5, params, 2),
  },




  {
    id: "toggle-switch",
    name: "Toggle switch",
    category: "input",
    source: { kind: "generated" },
    size: { x: 13, y: 22, z: 8 },
    summary: "Panel-mount SPDT toggle, 6 mm threaded bushing.",
    build: () => {
      const body = box(13, 10, 8, MATERIALS.plastic(0x1a1a1a));
      const bushing = cylinder(3, 6, MATERIALS.metal(), { y: 10 });
      const lever = cylinder(1.6, 10, MATERIALS.metal(), { y: 16 });
      lever.rotation.x = 0.28;
      return assemble("Toggle switch", body, bushing, lever);
    },
  },

  {
    id: "potentiometer",
    name: "Potentiometer 9 mm",
    category: "input",
    source: { kind: "generated" },
    size: { x: 12, y: 21, z: 11 },
    summary: "9 mm vertical pot with 6 mm D-shaft.",
    build: () => {
      const body = box(12, 8, 11, MATERIALS.plastic(0x1a1a1a));
      const bushing = cylinder(3.5, 5, MATERIALS.metal(), { y: 8 });
      const shaft = cylinder(3, 10, MATERIALS.metal(), { y: 13 });
      return assemble("Potentiometer", body, bushing, shaft);
    },
  },

  {
    id: "battery-18650",
    name: "18650 cell",
    category: "power",
    source: { kind: "generated" },
    size: { x: 18.6, y: 65.2, z: 18.6 },
    summary: "Li-ion 18650, 18.6 mm diameter x 65.2 mm (protected cells run longer).",
    build: () => {
      const cell = cylinder(9.3, 65.2, MATERIALS.cell());
      const positive = cylinder(3, 1.2, MATERIALS.metal(), { y: 65.2 });
      const wrap = cylinder(9.4, 58, MATERIALS.plastic(0x1f4a8a), { y: 3.5 });
      return assemble("18650 cell", cell, wrap, positive);
    },
  },

  {
    id: "lipo-503450",
    name: "LiPo 503450 (1000 mAh)",
    category: "power",
    source: { kind: "generated" },
    size: { x: 34, y: 5, z: 50 },
    summary: "Pouch cell 50 x 34 x 5 mm. The 6-digit code is thickness/width/length.",
    build: () => {
      const cell = box(34, 5, 50, MATERIALS.plastic(0x2b2f36));
      const tab = box(10, 0.4, 5, MATERIALS.metal(), { y: 2.3, z: 50 / 2 + 2 });
      return assemble("LiPo 503450", cell, tab);
    },
  },

  {
    id: "lipo-103450",
    name: "LiPo 103450 (2000 mAh)",
    category: "power",
    source: { kind: "generated" },
    size: { x: 34, y: 10, z: 50 },
    summary: "Thicker 2000 mAh pouch cell, 50 x 34 x 10 mm.",
    build: () => {
      const cell = box(34, 10, 50, MATERIALS.plastic(0x2b2f36));
      const tab = box(10, 0.4, 5, MATERIALS.metal(), { y: 4.8, z: 50 / 2 + 2 });
      return assemble("LiPo 103450", cell, tab);
    },
  },

  {
    id: "coin-cr2032",
    name: "Coin cell CR2032",
    category: "power",
    source: { kind: "generated" },
    size: { x: 20, y: 3.2, z: 20 },
    summary: "20 mm coin cell, 3.2 mm thick.",
    build: () => {
      const cell = cylinder(10, 3.2, MATERIALS.metal());
      return assemble("CR2032", cell);
    },
  },


  {
    id: "usb-c-breakout",
    name: "USB-C breakout",
    category: "connector",
    source: { kind: "generated" },
    size: { x: 16, y: 4, z: 14 },
    summary: "USB-C receptacle on a small breakout PCB.",
    build: () => {
      const pcb = box(16, 1.2, 14, MATERIALS.pcbBlack());
      const port = box(8.94, 3.26, 7.35, MATERIALS.metal(), {
        y: 1.2,
        z: -14 / 2 + 3,
      });
      return assemble("USB-C breakout", pcb, port);
    },
  },
] as const;
