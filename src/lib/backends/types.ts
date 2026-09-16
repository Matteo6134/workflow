import type { ControlPasses, RenderOutput, RenderSettings } from "@/lib/types";

/** Everything a backend needs to produce a render. */
export type RenderJob = {
  readonly passes: ControlPasses;
  readonly settings: RenderSettings;
};

/**
 * A swappable inference engine.
 *
 * Two implementations ship:
 *  - `fal`    hosted, pay-per-image, works with no GPU
 *  - `comfy`  any ComfyUI server (your own GPU box or a rented cloud GPU),
 *             zero marginal cost and no generation cap
 *
 * The UI talks only to this interface, so moving from one to the other is an
 * environment-variable change, not a rewrite.
 */
export interface RenderBackend {
  readonly id: string;
  readonly label: string;
  /** False when required env vars are absent, so the UI can explain why. */
  isConfigured(): boolean;
  /** Human-readable reason the backend is unusable, or null when ready. */
  configurationError(): string | null;
  /**
   * Actually reaches the service and confirms it will accept work.
   *
   * Distinct from {@link isConfigured}, which only checks that env vars exist.
   * Setting COMFYUI_URL to a machine that is switched off would otherwise
   * report a healthy backend right up until the first render fails.
   *
   * Resolves to null when live, or a human-readable reason when not.
   */
  checkLiveness(): Promise<string | null>;
  render(job: RenderJob): Promise<RenderOutput>;
}

/** Raised for expected, user-actionable failures (bad key, server down, ...). */
export class BackendError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "BackendError";
    this.status = status;
  }
}
