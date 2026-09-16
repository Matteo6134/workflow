import { fal } from "@fal-ai/client";
import type { ImageToImageControlNetUnionInput } from "@fal-ai/client/endpoints";
import { BackendError, type RenderBackend, type RenderJob } from "./types";
import type { ControlPasses, RenderOutput, RenderedImage } from "@/lib/types";
import { dimensionsFor } from "@/lib/imageSize";

/**
 * SDXL ControlNet Union: the one hosted endpoint that accepts a depth map AND
 * a normal map we supply ourselves (`*_preprocess: false`). That matters here -
 * we derive both passes from the real STL geometry, so the model gets exact
 * structure instead of depth guessed from a 2D picture.
 */
const MODEL_ID = "fal-ai/sdxl-controlnet-union/image-to-image";

/** Instagram's Content Publishing API ingests JPEG reliably; PNG often fails. */
const OUTPUT_FORMAT = "jpeg";

type FalImage = { url: string; width?: number; height?: number };
type FalResult = { images?: FalImage[]; seed?: number };

function dataUrlToBlob(dataUrl: string): Blob {
  const commaAt = dataUrl.indexOf(",");
  if (commaAt === -1) throw new BackendError("Malformed image data URL", 400);
  const mime = dataUrl.slice(5, dataUrl.indexOf(";"));
  const bytes = Buffer.from(dataUrl.slice(commaAt + 1), "base64");
  return new Blob([bytes], { type: mime });
}

export function createFalBackend(apiKey: string | undefined): RenderBackend {
  const configured = Boolean(apiKey && apiKey.trim());

  return {
    id: "fal",
    label: "fal.ai (hosted GPU)",

    isConfigured: () => configured,

    configurationError: () =>
      configured
        ? null
        : "FAL_KEY is not set. Add it to .env.local - get one at https://fal.ai/dashboard/keys",

    /**
     * Probes fal's storage endpoint, which is the cheapest call that exercises
     * both the key and the account balance - an exhausted balance rejects here
     * exactly as it would mid-render.
     */
    async checkLiveness(): Promise<string | null> {
      if (!configured) return "FAL_KEY is not set";

      try {
        const res = await fetch(
          "https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3",
          {
            method: "POST",
            headers: {
              Authorization: `Key ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content_type: "image/png",
              file_name: "healthcheck.png",
            }),
            signal: AbortSignal.timeout(5000),
          },
        );

        if (res.ok) return null;

        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        const detail = body.detail ?? `HTTP ${res.status}`;

        if (/exhausted balance|user is locked/i.test(detail)) {
          return "fal.ai balance is empty - top up at https://fal.ai/dashboard/billing";
        }
        return `fal.ai rejected the key: ${detail}`;
      } catch (cause) {
        return `Could not reach fal.ai: ${
          cause instanceof Error ? cause.message : String(cause)
        }`;
      }
    },

    async render({ passes, settings }: RenderJob): Promise<RenderOutput> {
      if (!configured) throw new BackendError("fal.ai backend is not configured", 503);
      fal.config({ credentials: apiKey });

      // fal needs URLs, not inline data, so the passes are uploaded first.
      const [imageUrl, depthUrl, normalUrl, edgeUrl] = await uploadPasses(passes);

      const [width, height] = dimensionsFor(
        settings.imageSize,
        settings.resolution,
      );

      const result = await subscribe({
        prompt: settings.prompt,
        negative_prompt: settings.negativePrompt,
        image_url: imageUrl,
        depth_image_url: depthUrl,
        normal_image_url: normalUrl,
        // The edge pass is a hidden-line drawing of the real CAD edges, so it
        // is fed to the canny control directly. This is what stops the model
        // resizing or restyling the product.
        canny_image_url: edgeUrl,
        // Every pass is already a true control map - never re-derive them.
        depth_preprocess: false,
        normal_preprocess: false,
        canny_preprocess: false,
        controlnet_conditioning_scale: settings.shapeFidelity,
        strength: settings.creativeFreedom,
        num_inference_steps: settings.steps,
        guidance_scale: settings.guidance,
        num_images: settings.numImages,
        // Explicit dimensions rather than fal's preset name, so the output
        // matches the control passes pixel for pixel at any resolution tier.
        image_size: { width, height },
        format: OUTPUT_FORMAT,
        ...(settings.seed === undefined ? {} : { seed: settings.seed }),
      });

      const images: readonly RenderedImage[] = (result.images ?? []).map((img) => ({
        url: img.url,
        width: img.width ?? width,
        height: img.height ?? height,
        // fal serves results from a public CDN, so these can go straight to Instagram.
        publiclyReachable: true,
      }));

      if (images.length === 0) {
        throw new BackendError("fal.ai returned no images");
      }

      return { images, seed: result.seed ?? 0, backendId: "fal" };
    },
  };
}

async function uploadPasses(
  passes: ControlPasses,
): Promise<[string, string, string, string]> {
  try {
    return (await Promise.all([
      fal.storage.upload(dataUrlToBlob(passes.beauty)),
      fal.storage.upload(dataUrlToBlob(passes.depth)),
      fal.storage.upload(dataUrlToBlob(passes.normal)),
      fal.storage.upload(dataUrlToBlob(passes.edge)),
    ])) as [string, string, string, string];
  } catch (cause) {
    throw asBackendError(cause, "Could not upload the viewport passes to fal.ai");
  }
}

/** Maps a fal failure onto the clearest message and status we can give. */
function asBackendError(cause: unknown, context: string): BackendError {
  const message = describe(cause);

  if (/exhausted balance|user is locked/i.test(message)) {
    return new BackendError(
      "Your fal.ai balance is empty, so renders are blocked. " +
        "Top up at https://fal.ai/dashboard/billing - or switch to your own GPU " +
        "by setting RENDER_BACKEND=comfy, which has no per-image cost.",
      402,
    );
  }

  if (/401|unauthor|invalid.*(key|token)/i.test(message)) {
    return new BackendError(
      `fal.ai rejected the API key. Check FAL_KEY in .env.local. (${message})`,
      401,
    );
  }

  return new BackendError(`${context}: ${message}`);
}

async function subscribe(
  input: ImageToImageControlNetUnionInput,
): Promise<FalResult> {
  try {
    const { data } = await fal.subscribe(MODEL_ID, { input });
    return data as FalResult;
  } catch (cause) {
    throw asBackendError(cause, "fal.ai render failed");
  }
}

/**
 * Pulls the useful text out of a fal error.
 *
 * The client surfaces only the HTTP status text ("Forbidden"), while the real
 * reason sits in the response body - an exhausted balance, a bad key, a model
 * that rejected an input. Showing "Forbidden" sends the user hunting for a
 * permissions problem they do not have.
 */
function describe(cause: unknown): string {
  const detail = extractDetail(cause);
  if (cause instanceof Error) {
    return detail && detail !== cause.message
      ? `${cause.message} - ${detail}`
      : cause.message;
  }
  return detail ?? (typeof cause === "string" ? cause : JSON.stringify(cause));
}

/** fal puts the human-readable reason in `body.detail`, sometimes nested. */
function extractDetail(cause: unknown): string | null {
  if (!cause || typeof cause !== "object") return null;
  const body = (cause as { body?: unknown }).body;
  if (!body || typeof body !== "object") return null;

  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;

  // Validation errors arrive as a list of {msg, loc} entries.
  if (Array.isArray(detail)) {
    const messages = detail
      .map((entry) =>
        entry && typeof entry === "object" && "msg" in entry
          ? String((entry as { msg: unknown }).msg)
          : null,
      )
      .filter((value): value is string => Boolean(value));
    if (messages.length) return messages.join("; ");
  }
  return null;
}
