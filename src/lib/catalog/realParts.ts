import { KICAD_ATTRIBUTION, kicadModelUrl } from "./sources";
import type { LibraryComponent } from "./types";

/**
 * Real manufacturer CAD models.
 *
 * Every path here was verified against the live repository file listings, and
 * the two unit conventions were verified by measurement rather than assumed:
 *
 *  - KiCad .wrl is authored in 0.1-inch units (a "6 mm" switch measures 2.3622
 *    raw units; 2.3622 x 2.54 = 6.00 mm)
 *  - Adafruit .step is read as explicit millimetres by the importer (the
 *    NeoPixel strip comes out 224.00 x 12.00 x 1.74 mm)
 *
 * Sizes below are nominal, for the browser list. Each part is re-measured from
 * its actual geometry once loaded, so the figure shown on the stage is the real
 * one rather than a number typed in here.
 */

const ADAFRUIT_BASE =
  "https://raw.githubusercontent.com/adafruit/Adafruit_CAD_Parts/main/";

const ADAFRUIT_ATTRIBUTION =
  "CAD model by Adafruit Industries (Adafruit_CAD_Parts, MIT)";

/** Paths contain spaces, so each segment is encoded. */
function adafruitModelUrl(path: string): string {
  return ADAFRUIT_BASE + path.split("/").map(encodeURIComponent).join("/");
}

export const LIBRARY_PARTS: readonly LibraryComponent[] = [
  /* ------------------------------ Lighting ------------------------------ */
  {
    id: "neopixel-strip",
    name: "NeoPixel LED strip",
    category: "light",
    size: { x: 12, y: 1.74, z: 224 },
    summary: "Addressable WS2812 strip, 12 mm wide. Real Adafruit CAD model.",
    source: {
      kind: "library",
      url: adafruitModelUrl("1376 NeoPixel Strip/1376 NeoPixel Strip.step"),
      attribution: ADAFRUIT_ATTRIBUTION,
    },
    reference: "https://www.adafruit.com/product/1376",
  },
  {
    id: "neopixel-stick",
    name: "NeoPixel stick (8x)",
    category: "light",
    size: { x: 10, y: 3, z: 51 },
    summary: "8 addressable RGB LEDs on a rigid stick.",
    source: {
      kind: "library",
      url: adafruitModelUrl("1426 8x NeoPixel Stick/1426 8x NeoPixel Stick.step"),
      attribution: ADAFRUIT_ATTRIBUTION,
    },
  },
  {
    id: "neopixel-ring-16",
    name: "NeoPixel ring (16x)",
    category: "light",
    size: { x: 44.5, y: 3, z: 44.5 },
    summary: "16 addressable RGB LEDs in a 44.5 mm ring.",
    source: {
      kind: "library",
      url: adafruitModelUrl("1463 16x NeoPixel Ring/1463 16x NeoPixel Ring.step"),
      attribution: ADAFRUIT_ATTRIBUTION,
    },
  },
  {
    id: "led-5mm",
    name: "LED 5 mm through-hole",
    category: "light",
    size: { x: 5, y: 8.6, z: 5 },
    summary: "Standard 5 mm domed LED with leads.",
    source: {
      kind: "library",
      url: kicadModelUrl("LED_THT.3dshapes/LED_D5.0mm.wrl"),
      attribution: KICAD_ATTRIBUTION,
    },
  },

  /* ------------------------------- Boards ------------------------------- */
  {
    id: "qtpy-rp2040",
    name: "QT Py RP2040",
    category: "board",
    size: { x: 17.9, y: 5, z: 21.8 },
    summary:
      "Thumb-size RP2040 board in the same 21 x 17.5 mm footprint class as the Seeed XIAO.",
    source: {
      kind: "library",
      url: adafruitModelUrl("4900 QTPy RP2040/4900 QTPY-RP2040.step"),
      attribution: ADAFRUIT_ATTRIBUTION,
    },
    reference: "https://www.adafruit.com/product/4900",
  },
  {
    id: "qtpy-esp32s2",
    name: "QT Py ESP32-S2",
    category: "board",
    size: { x: 17.9, y: 6, z: 21.8 },
    summary: "Thumb-size ESP32-S2 board with Wi-Fi, XIAO-class footprint.",
    source: {
      kind: "library",
      url: adafruitModelUrl("5325 QTPy ESP32S2/5325 QTPy ESP32S2.step"),
      attribution: ADAFRUIT_ATTRIBUTION,
    },
  },
  {
    id: "feather-esp32",
    name: "HUZZAH32 ESP32 Feather",
    category: "board",
    size: { x: 22.8, y: 7, z: 50.8 },
    summary: "ESP32 Feather with on-board LiPo charging.",
    source: {
      kind: "library",
      url: adafruitModelUrl(
        "3405 ESP32 Feather HUZZAH/3405 Adafruit HUZZAH32 ESP32 Feather.step",
      ),
      attribution: ADAFRUIT_ATTRIBUTION,
    },
  },
  {
    id: "esp32-wroom",
    name: "ESP32-WROOM-32 module",
    category: "board",
    size: { x: 18, y: 3.1, z: 25.5 },
    summary: "The shielded ESP32 module itself, for designing it into a PCB.",
    source: {
      kind: "library",
      url: kicadModelUrl("RF_Module.3dshapes/ESP32-WROOM-32.wrl"),
      attribution: KICAD_ATTRIBUTION,
    },
  },

  /* ------------------------------ Displays ------------------------------ */
  {
    id: "oled-091",
    name: 'OLED 0.91" I2C',
    category: "display",
    size: { x: 33, y: 4, z: 13 },
    summary: "128x32 monochrome OLED breakout.",
    source: {
      kind: "library",
      url: adafruitModelUrl(
        "4440 0.91 OLED I2C Display/4440 0.91 OLED I2C Display.step",
      ),
      attribution: ADAFRUIT_ATTRIBUTION,
    },
    reference: "https://www.adafruit.com/product/4440",
  },
  {
    id: "oled-ssd1306",
    name: "SSD1306 OLED module",
    category: "display",
    size: { x: 27, y: 4, z: 27 },
    summary: "The classic 128x64 SSD1306 OLED module.",
    source: {
      kind: "library",
      url: kicadModelUrl("Display.3dshapes/Adafruit_SSD1306.wrl"),
      attribution: KICAD_ATTRIBUTION,
    },
  },
  {
    id: "tft-144",
    name: 'TFT 1.44" colour',
    category: "display",
    size: { x: 34, y: 5, z: 44 },
    summary: "128x128 colour TFT breakout.",
    source: {
      kind: "library",
      url: adafruitModelUrl("2088 1.44in TFT Display/2088 1.44in TFT Display-revC.step"),
      attribution: ADAFRUIT_ATTRIBUTION,
    },
  },

  /* -------------------------------- Power ------------------------------- */
  {
    id: "lipo-150",
    name: "LiPo cell 150 mAh",
    category: "power",
    size: { x: 19, y: 5, z: 28 },
    summary: "Small pouch cell for compact builds.",
    source: {
      kind: "library",
      url: adafruitModelUrl("1317 150mAh Lipo Battery/1317 150mAh Lipo Battery.step"),
      attribution: ADAFRUIT_ATTRIBUTION,
    },
  },
  {
    id: "lipo-2500",
    name: "LiPo cell 2500 mAh",
    category: "power",
    size: { x: 50, y: 10, z: 65 },
    summary: "Large pouch cell for long runtime.",
    source: {
      kind: "library",
      url: adafruitModelUrl("328 2500mAh battery/328 2500mAh battery.step"),
      attribution: ADAFRUIT_ATTRIBUTION,
    },
  },
  {
    id: "holder-18650",
    name: "18650 cell holder",
    category: "power",
    size: { x: 21, y: 19, z: 77 },
    summary: "Through-hole holder for a single 18650 cell.",
    source: {
      kind: "library",
      url: kicadModelUrl("Battery.3dshapes/BatteryHolder_Keystone_1042_1x18650.wrl"),
      attribution: KICAD_ATTRIBUTION,
    },
  },
  {
    id: "holder-cr2032",
    name: "CR2032 coin holder",
    category: "power",
    size: { x: 24, y: 6, z: 25 },
    summary: "Keystone through-hole holder for a 20 mm coin cell.",
    source: {
      kind: "library",
      url: kicadModelUrl("Battery.3dshapes/BatteryHolder_Keystone_1058_1x2032.wrl"),
      attribution: KICAD_ATTRIBUTION,
    },
  },

  /* ------------------------------ Controls ------------------------------ */
  {
    id: "button-6mm",
    name: "Tactile button 6 mm",
    category: "input",
    size: { x: 6, y: 4.3, z: 6 },
    summary: "Standard 6 x 6 mm tact switch, 4.3 mm actuator.",
    source: {
      kind: "library",
      url: kicadModelUrl("Button_Switch_THT.3dshapes/SW_PUSH_6mm_H4.3mm.wrl"),
      attribution: KICAD_ATTRIBUTION,
    },
  },
  {
    id: "button-12mm",
    name: "Tactile button 12 mm",
    category: "input",
    size: { x: 12, y: 7.3, z: 12 },
    summary: "Larger 12 mm panel-friendly tact switch.",
    source: {
      kind: "library",
      url: adafruitModelUrl(
        "1119 Tactile Switch 12mm (B3F-40XX)/1119-12mm-TactileSwitch.step",
      ),
      attribution: ADAFRUIT_ATTRIBUTION,
    },
  },
  {
    id: "buzzer-12mm",
    name: "Buzzer 12 mm",
    category: "input",
    size: { x: 12, y: 9.5, z: 12 },
    summary: "Piezo buzzer, 12 mm diameter.",
    source: {
      kind: "library",
      url: kicadModelUrl("Buzzer_Beeper.3dshapes/Buzzer_12x9.5RM7.6.wrl"),
      attribution: KICAD_ATTRIBUTION,
    },
  },
] as const;
