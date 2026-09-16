import { describe, expect, it } from "vitest";
import {
  KICAD_UNIT_TO_MM,
  isAllowedModelUrl,
  kicadModelUrl,
} from "./sources";

describe("model source allow-list", () => {
  it("accepts the KiCad library", () => {
    expect(
      isAllowedModelUrl(kicadModelUrl("LED_THT.3dshapes/LED_D5.0mm.wrl")),
    ).toBe(true);
  });

  /**
   * The proxy would otherwise be an SSRF hole: an attacker-supplied src could
   * reach cloud metadata endpoints or internal services from the server.
   */
  it.each([
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost:8188/view",
    "https://raw.githubusercontent.com/evil/repo/model.wrl",
    "https://evil.example.com/raw.githubusercontent.com/KiCad/x.wrl",
    "file:///etc/passwd",
  ])("rejects %s", (url) => {
    expect(isAllowedModelUrl(url)).toBe(false);
  });

  it("is not fooled by an allow-listed prefix appearing later in the URL", () => {
    expect(
      isAllowedModelUrl(
        "https://evil.test/?x=https://raw.githubusercontent.com/KiCad/kicad-packages3D/a.wrl",
      ),
    ).toBe(false);
  });
});

describe("KiCad unit conversion", () => {
  /**
   * Verified against the real file: SW_PUSH_6mm_H4.3mm measures 2.3622 raw
   * units across its body, and 2.3622 * 2.54 = 6.00 mm.
   */
  it("converts 0.1-inch authoring units to millimetres", () => {
    expect(KICAD_UNIT_TO_MM).toBe(2.54);
    expect(2.3622 * KICAD_UNIT_TO_MM).toBeCloseTo(6.0, 2);
  });
});
