import {
  MATERIALS,
  assemble,
  box,
  microUsbPort,
  pinHeader,
  usbCPort,
} from "./builders";
import type { GeneratedComponent } from "./types";

/**
 * Microcontroller boards at datasheet dimensions.
 * Axis convention: x = width, z = length, y = height above the mounting plane.
 */

export const BOARD_PARTS: readonly GeneratedComponent[] = [
  {
    id: "xiao",
    name: "Seeed XIAO",
    category: "board",
    source: { kind: "generated" },
    // Every board in the XIAO series shares this footprint.
    size: { x: 17.5, y: 3.5, z: 21 },
    summary: "Thumb-size MCU, 21 x 17.5 mm. ESP32-C3 / S3 / SAMD21 / nRF52840.",
    reference: "https://www.seeedstudio.com/Seeed-XIAO-ESP32C3-p-5431.html",
    build: () => {
      const pcb = box(17.5, 1.0, 21, MATERIALS.pcbBlack());
      const shield = box(11, 1.0, 12, MATERIALS.metal(), { y: 1.0, z: -1 });
      const usb = usbCPort(MATERIALS.metal(), { y: 1.0, z: 21 / 2 - 3.2 });
      const button = box(2.5, 1.0, 2.5, MATERIALS.plastic(0xd8d8d8), {
        y: 1.0,
        x: -5.5,
        z: 5.5,
      });
      const pads = assemble(
        "pads",
        ...[-1, 1].flatMap((side) =>
          Array.from({ length: 7 }, (_, index) =>
            box(1.6, 0.1, 1.2, MATERIALS.gold(), {
              x: side * (17.5 / 2 - 0.9),
              y: 1.0,
              z: -7.6 + index * 2.54,
            }),
          ),
        ),
      );
      return assemble("Seeed XIAO", pcb, shield, usb, button, pads);
    },
  },

  {
    id: "pi-pico",
    name: "Raspberry Pi Pico",
    category: "board",
    source: { kind: "generated" },
    size: { x: 21, y: 3.9, z: 51 },
    summary: "RP2040 board, 51 x 21 mm, castellated edges.",
    reference: "https://datasheets.raspberrypi.com/pico/pico-datasheet.pdf",
    build: () => {
      const pcb = box(21, 1.0, 51, MATERIALS.pcbGreen());
      const mcu = box(7, 0.9, 7, MATERIALS.chip(), { y: 1.0, z: 2 });
      const flash = box(5, 0.8, 4, MATERIALS.chip(), { y: 1.0, z: -6 });
      const usb = microUsbPort(MATERIALS.metal(), { y: 1.0, z: -51 / 2 + 2.6 });
      const button = box(3.5, 1.4, 3.5, MATERIALS.plastic(0xf0f0f0), {
        y: 1.0,
        z: 13,
      });
      const left = pinHeader(20, MATERIALS.gold(), { x: -9.5, y: 1.0 });
      const right = pinHeader(20, MATERIALS.gold(), { x: 9.5, y: 1.0 });
      // Headers run along the length, so rotate the rows onto the Z axis.
      left.rotation.y = Math.PI / 2;
      right.rotation.y = Math.PI / 2;
      return assemble("Raspberry Pi Pico", pcb, mcu, flash, usb, button, left, right);
    },
  },

  {
    id: "arduino-nano",
    name: "Arduino Nano",
    category: "board",
    source: { kind: "generated" },
    size: { x: 18, y: 7, z: 45 },
    summary: "Compact ATmega328P board, 45 x 18 mm.",
    reference: "https://docs.arduino.cc/hardware/nano",
    build: () => {
      const pcb = box(18, 1.6, 45, MATERIALS.pcbBlue());
      const mcu = box(9, 1.2, 9, MATERIALS.chip(), { y: 1.6, z: 3 });
      const usb = microUsbPort(MATERIALS.metal(), { y: 1.6, z: -45 / 2 + 2.8 });
      const left = pinHeader(15, MATERIALS.gold(), { x: -7.6, y: 1.6 });
      const right = pinHeader(15, MATERIALS.gold(), { x: 7.6, y: 1.6 });
      left.rotation.y = Math.PI / 2;
      right.rotation.y = Math.PI / 2;
      return assemble("Arduino Nano", pcb, mcu, usb, left, right);
    },
  },

  {
    id: "arduino-uno",
    name: "Arduino Uno R3",
    category: "board",
    source: { kind: "generated" },
    size: { x: 53.4, y: 13, z: 68.6 },
    summary: "The classic 68.6 x 53.4 mm shield-compatible board.",
    reference: "https://docs.arduino.cc/hardware/uno-rev3",
    build: () => {
      const pcb = box(53.4, 1.6, 68.6, MATERIALS.pcbBlue());
      const mcu = box(7, 1.2, 35, MATERIALS.chip(), { y: 1.6, z: 6 });
      // USB-B stands proud of the board and often decides enclosure depth.
      const usb = box(12, 11, 16, MATERIALS.metal(), {
        y: 1.6,
        x: -18,
        z: -68.6 / 2 + 4,
      });
      const barrel = box(9, 11, 13.5, MATERIALS.plastic(0x101010), {
        y: 1.6,
        x: -18,
        z: 68.6 / 2 - 5,
      });
      const headerA = pinHeader(10, MATERIALS.plastic(0x101010), {
        x: 6,
        y: 1.6,
        z: -24,
      });
      const headerB = pinHeader(8, MATERIALS.plastic(0x101010), {
        x: 10,
        y: 1.6,
        z: 24,
      });
      return assemble("Arduino Uno R3", pcb, mcu, usb, barrel, headerA, headerB);
    },
  },

  {
    id: "esp32-devkit",
    name: "ESP32 DevKit v1",
    category: "board",
    source: { kind: "generated" },
    size: { x: 27.9, y: 5, z: 54.4 },
    summary: "30-pin ESP32 development board with on-board antenna.",
    reference: "https://docs.espressif.com/projects/esp-idf/en/latest/esp32/hw-reference/",
    build: () => {
      const pcb = box(27.9, 1.6, 54.4, MATERIALS.pcbBlack());
      const shield = box(18, 3.2, 25.5, MATERIALS.metal(), { y: 1.6, z: -10 });
      // The antenna keep-out region designers must leave clear of metal.
      const antenna = box(16, 0.6, 6, MATERIALS.pcbBlack(), {
        y: 1.6,
        z: -54.4 / 2 + 3.5,
      });
      const usb = microUsbPort(MATERIALS.metal(), { y: 1.6, z: 54.4 / 2 - 2.8 });
      const left = pinHeader(15, MATERIALS.plastic(0x101010), { x: -12.7, y: 1.6 });
      const right = pinHeader(15, MATERIALS.plastic(0x101010), { x: 12.7, y: 1.6 });
      left.rotation.y = Math.PI / 2;
      right.rotation.y = Math.PI / 2;
      return assemble("ESP32 DevKit v1", pcb, shield, antenna, usb, left, right);
    },
  },
] as const;
