/**
 * Decides what is allowed to appear in a captured pass.
 *
 * Kept as a pure, testable function because getting this wrong is invisible in
 * the viewport and only shows up as artefacts baked into a finished render. A
 * transform gizmo's axis arrows were conditioned into renders exactly this way.
 */

/** The minimum shape needed to make the decision; keeps this free of three.js. */
export type CaptureCandidate = {
  readonly isStageRoot: boolean;
  readonly isLight: boolean;
  readonly isFlaggedHelper: boolean;
};

/**
 * Whitelist, not blacklist. Only the stage and the lights survive a capture.
 *
 * A blacklist would need to enumerate every helper that could ever exist in the
 * scene, and the first unknown one silently corrupts the control passes.
 */
export function shouldHideDuringCapture(candidate: CaptureCandidate): boolean {
  if (candidate.isFlaggedHelper) return true;
  if (candidate.isStageRoot) return false;
  if (candidate.isLight) return false;
  return true;
}
