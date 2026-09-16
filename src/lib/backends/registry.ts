import { env } from "@/lib/env";
import { createFalBackend } from "./fal";
import { createComfyBackend } from "./comfy";
import type { RenderBackend } from "./types";

/**
 * Resolves the configured backend. Both are constructed so the UI can report
 * on the inactive one too ("ComfyUI not configured"), which makes the eventual
 * switch to your own GPU a visible, checkable step.
 */
export function getBackend(): RenderBackend {
  return env.backend === "comfy" ? comfyBackend() : falBackend();
}

export function falBackend(): RenderBackend {
  return createFalBackend(env.falKey);
}

export function comfyBackend(): RenderBackend {
  return createComfyBackend({
    baseUrl: env.comfyUrl,
    models: {
      checkpoint: env.comfyCheckpoint,
      controlNet: env.comfyControlNet,
      controlNetCanny: env.comfyControlNetCanny,
    },
    timeoutMinutes: env.comfyTimeoutMinutes,
  });
}

export type BackendStatus = {
  readonly id: string;
  readonly label: string;
  readonly active: boolean;
  /** Env vars are present. Says nothing about whether the service answers. */
  readonly configured: boolean;
  /** The service was actually reached and will accept work. Null = not probed. */
  readonly live: boolean | null;
  readonly error: string | null;
  /** Whether renders from this backend can be sent straight to Instagram. */
  readonly outputsPublicUrls: boolean;
};

/**
 * Only the ACTIVE backend is probed over the network. Probing both would make
 * every page load wait on a service the user is not even using.
 */
export async function backendStatuses(): Promise<readonly BackendStatus[]> {
  const backends = [falBackend(), comfyBackend()];

  return Promise.all(
    backends.map(async (backend) => {
      const active = backend.id === env.backend;
      const configError = backend.configurationError();

      // A missing env var is already conclusive; skip the network round-trip.
      const livenessError =
        active && !configError ? await backend.checkLiveness() : null;

      return {
        id: backend.id,
        label: backend.label,
        active,
        configured: backend.isConfigured(),
        live: active && !configError ? livenessError === null : null,
        error: configError ?? livenessError,
        outputsPublicUrls: backend.id === "fal",
      };
    }),
  );
}
