import { MATERIALS, assemble, box, emissivePanel, pinHeader } from "./builders";
import type { GeneratedComponent } from "./types";

/**
 * Display modules. The lit area is modelled separately from the module outline,
 * because the two are very different sizes and it is the *active* area a
 * designer has to align a window or lens to.
 */

export const DISPLAY_PARTS: readonly GeneratedComponent[] = [
  {
    id: "oled-096",
    name: 'OLED 0.96" SSD1306',
    category: "display",
    source: { kind: "generated" },
    size: { x: 27, y: 4, z: 27 },
    summary: "128x64 I2C OLED. Module 27 x 27 mm, active area 21.7 x 10.9 mm.",
    reference: "https://www.snapeda.com/parts/DM-OLED096-636/Display%20Module/view-part/",
    build: () => {
      const pcb = box(27, 1.2, 27, MATERIALS.pcbBlue());
      const glass = box(26, 1.6, 15, MATERIALS.glass(), { y: 1.2, z: -3 });
      // 128x64 pixels at 0.166 mm pitch.
      const active = emissivePanel(21.7, 10.9, 0x5ec8ff, 1.4, {
        y: 2.85,
        z: -3,
      });
      const header = pinHeader(4, MATERIALS.plastic(0x101010), {
        y: 1.2,
        z: 27 / 2 - 2.6,
      });
      return assemble('OLED 0.96" SSD1306', pcb, glass, active, header);
    },
  },

  {
    id: "oled-13",
    name: 'OLED 1.3" SH1106',
    category: "display",
    source: { kind: "generated" },
    size: { x: 35.5, y: 4.2, z: 33.5 },
    summary: "128x64 I2C OLED, larger 1.3 inch glass. Active area 29.4 x 14.7 mm.",
    build: () => {
      const pcb = box(35.5, 1.2, 33.5, MATERIALS.pcbBlue());
      const glass = box(34, 1.8, 20, MATERIALS.glass(), { y: 1.2, z: -3.5 });
      const active = emissivePanel(29.4, 14.7, 0x5ec8ff, 1.4, {
        y: 3.05,
        z: -3.5,
      });
      const header = pinHeader(4, MATERIALS.plastic(0x101010), {
        y: 1.2,
        z: 33.5 / 2 - 2.6,
      });
      return assemble('OLED 1.3" SH1106', pcb, glass, active, header);
    },
  },

  {
    id: "lcd-1602",
    name: "LCD 1602 character",
    category: "display",
    source: { kind: "generated" },
    size: { x: 80, y: 13, z: 36 },
    summary: "16x2 HD44780 character LCD. Module 80 x 36 mm, viewing area 64.5 x 16 mm.",
    reference: "https://www.openhacks.com/uploadsproductos/eone-1602a1.pdf",
    build: () => {
      const pcb = box(80, 1.6, 36, MATERIALS.pcbGreen());
      const bezel = box(71.3, 7.2, 24.3, MATERIALS.metal(), { y: 1.6 });
      const glass = box(66, 0.8, 19, MATERIALS.glass(), { y: 8.8 });
      const active = emissivePanel(64.5, 16, 0x2f7de0, 1.1, { y: 9.3 });
      const header = pinHeader(16, MATERIALS.plastic(0x101010), {
        y: 1.6,
        z: -36 / 2 + 2.6,
      });
      return assemble("LCD 1602", pcb, bezel, glass, active, header);
    },
  },

  {
    id: "tft-18",
    name: 'TFT 1.8" ST7735',
    category: "display",
    source: { kind: "generated" },
    size: { x: 34, y: 4.5, z: 56 },
    summary: "160x128 colour TFT. Module 34 x 56 mm, active area 28.0 x 35.0 mm.",
    build: () => {
      const pcb = box(34, 1.2, 56, MATERIALS.pcbBlue());
      const glass = box(33, 2.2, 42, MATERIALS.glass(), { y: 1.2, z: -4 });
      const active = emissivePanel(28, 35, 0x8fd0ff, 1.2, { y: 3.45, z: -4 });
      const header = pinHeader(8, MATERIALS.plastic(0x101010), {
        y: 1.2,
        z: 56 / 2 - 2.6,
      });
      return assemble('TFT 1.8" ST7735', pcb, glass, active, header);
    },
  },
] as const;
