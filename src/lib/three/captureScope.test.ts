import { describe, expect, it } from "vitest";
import { shouldHideDuringCapture } from "./captureScope";

const candidate = (over: Partial<Parameters<typeof shouldHideDuringCapture>[0]>) => ({
  isStageRoot: false,
  isLight: false,
  isFlaggedHelper: false,
  ...over,
});

describe("shouldHideDuringCapture", () => {
  it("keeps the stage, which is the thing being rendered", () => {
    expect(shouldHideDuringCapture(candidate({ isStageRoot: true }))).toBe(false);
  });

  it("keeps lights, which the beauty pass needs", () => {
    expect(shouldHideDuringCapture(candidate({ isLight: true }))).toBe(false);
  });

  /**
   * The regression this function exists for: a transform gizmo is neither the
   * stage nor a light, so a whitelist hides it without having to recognise it.
   */
  it("hides anything that is neither the stage nor a light", () => {
    expect(shouldHideDuringCapture(candidate({}))).toBe(true);
  });

  it("hides explicitly flagged helpers even inside the stage", () => {
    expect(
      shouldHideDuringCapture(candidate({ isStageRoot: true, isFlaggedHelper: true })),
    ).toBe(true);
  });

  it("hides a flagged helper that also claims to be a light", () => {
    expect(
      shouldHideDuringCapture(candidate({ isLight: true, isFlaggedHelper: true })),
    ).toBe(true);
  });
});
