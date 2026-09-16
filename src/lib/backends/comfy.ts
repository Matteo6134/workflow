import { BackendError, type RenderBackend, type RenderJob } from "./types";
import type { RenderOutput, RenderedImage } from "@/lib/types";
import {
  buildComfyWorkflow,
  resolveSize,
  type ComfyModelConfig,
} from "./comfyWorkflow";

const POLL_INTERVAL_MS = 1200;
/**
 * Default ceiling on a single render.
 *
 * A GPU finishes SDXL with two ControlNets in seconds, but the same workflow on
 * CPU takes 20-45 minutes. The previous 10-minute ceiling turned a slow-but-
 * working CPU setup into an unexplained timeout, so this is generous by default
 * and overridable with COMFYUI_TIMEOUT_MINUTES.
 */
const DEFAULT_TIMEOUT_MINUTES = 45;
/** A health probe must fail fast; the UI waits on it during page load. */
const LIVENESS_TIMEOUT_MS = 2500;


type ComfyImageRef = { filename: string; subfolder: string; type: string };

export type ComfyConfig = {
  readonly baseUrl: string | undefined;
  readonly models: ComfyModelConfig;
  /** Overrides how long a single render may take. */
  readonly timeoutMinutes?: number;
};

export function createComfyBackend(config: ComfyConfig): RenderBackend {
  const baseUrl = config.baseUrl?.replace(/\/+$/, "");
  const configured = Boolean(baseUrl);

  return {
    id: "comfy",
    label: "ComfyUI (your own GPU)",

    isConfigured: () => configured,

    configurationError: () =>
      configured
        ? null
        : "COMFYUI_URL is not set. Point it at your ComfyUI server, e.g. http://localhost:8188",

    /**
     * Confirms a ComfyUI server is actually answering, and that the models the
     * workflow references exist on it. A URL pointing at a switched-off machine
     * is configured but not usable, and saying so now beats failing mid-render.
     */
    async checkLiveness(): Promise<string | null> {
      if (!baseUrl) return "COMFYUI_URL is not set";

      let stats: Response;
      try {
        stats = await fetch(`${baseUrl}/system_stats`, {
          cache: "no-store",
          signal: AbortSignal.timeout(LIVENESS_TIMEOUT_MS),
        });
      } catch {
        return `No ComfyUI server answering at ${baseUrl}. Start ComfyUI, or point COMFYUI_URL at the machine running it.`;
      }

      if (!stats.ok) {
        return `ComfyUI at ${baseUrl} responded ${stats.status}`;
      }

      return missingModels(baseUrl, config.models);
    },

    async render({ passes, settings }: RenderJob): Promise<RenderOutput> {
      if (!baseUrl) throw new BackendError("ComfyUI backend is not configured", 503);

      const seed = settings.seed ?? Math.floor(Math.random() * 2 ** 31);

      const [beautyName, depthName, edgeName] = await Promise.all([
        uploadImage(baseUrl, passes.beauty, "beauty.png"),
        uploadImage(baseUrl, passes.depth, "depth.png"),
        uploadImage(baseUrl, passes.edge, "edge.png"),
      ]);

      const workflow = buildComfyWorkflow({
        beautyImageName: beautyName,
        depthImageName: depthName,
        edgeImageName: edgeName,
        settings,
        seed,
        models: config.models,
      });

      const promptId = await queuePrompt(baseUrl, workflow);
      const refs = await awaitOutputs(
        baseUrl,
        promptId,
        config.timeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES,
      );
      const [width, height] = resolveSize(settings.imageSize, settings.resolution);

      const images: readonly RenderedImage[] = refs.map((ref) => ({
        // Served through our own proxy so the browser can load it even when
        // ComfyUI runs on a different machine.
        url: `/api/comfy/image?${new URLSearchParams({
          filename: ref.filename,
          subfolder: ref.subfolder ?? "",
          type: ref.type ?? "output",
        })}`,
        width,
        height,
        // A local ComfyUI server is not reachable from Instagram's servers.
        publiclyReachable: false,
      }));

      if (images.length === 0) throw new BackendError("ComfyUI returned no images");

      return { images, seed, backendId: "comfy" };
    },
  };
}

/**
 * Checks the checkpoint and both ControlNets exist on the server.
 *
 * These are the failures that would otherwise surface as an opaque rejection
 * from /prompt after the user has already framed a shot.
 */
async function missingModels(
  baseUrl: string,
  models: ComfyModelConfig,
): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/object_info`, {
      // Models can be added to the server while this app is running.
      cache: "no-store",
      signal: AbortSignal.timeout(LIVENESS_TIMEOUT_MS),
    });
    if (!res.ok) return null; // Server is up; skip the deeper check.

    const info = (await res.json()) as Record<
      string,
      { input?: { required?: Record<string, unknown[]> } }
    >;

    const checkpoints = firstEnum(info.CheckpointLoaderSimple, "ckpt_name");
    const controlNets = firstEnum(info.ControlNetLoader, "control_net_name");

    const missing: string[] = [];
    if (checkpoints && !checkpoints.includes(models.checkpoint)) {
      missing.push(`checkpoint "${models.checkpoint}"`);
    }
    if (controlNets && !controlNets.includes(models.controlNet)) {
      missing.push(`depth ControlNet "${models.controlNet}"`);
    }
    if (controlNets && !controlNets.includes(models.controlNetCanny)) {
      missing.push(`canny ControlNet "${models.controlNetCanny}"`);
    }

    if (missing.length === 0) return null;
    return `ComfyUI is running but is missing ${missing.join(", ")}. Install them, or set COMFYUI_CHECKPOINT / COMFYUI_CONTROLNET / COMFYUI_CONTROLNET_CANNY to files it does have.`;
  } catch {
    // The server answered /system_stats, so treat it as usable.
    return null;
  }
}

/** ComfyUI reports selectable files as the first element of the input tuple. */
function firstEnum(
  node: { input?: { required?: Record<string, unknown[]> } } | undefined,
  field: string,
): string[] | null {
  const entry = node?.input?.required?.[field];
  const options = Array.isArray(entry) ? entry[0] : null;
  return Array.isArray(options) ? options.filter((v): v is string => typeof v === "string") : null;
}

async function uploadImage(
  baseUrl: string,
  dataUrl: string,
  filename: string,
): Promise<string> {
  const commaAt = dataUrl.indexOf(",");
  if (commaAt === -1) throw new BackendError("Malformed image data URL", 400);
  const bytes = Buffer.from(dataUrl.slice(commaAt + 1), "base64");

  const form = new FormData();
  form.append("image", new Blob([bytes], { type: "image/png" }), filename);
  form.append("overwrite", "true");

  const res = await request(`${baseUrl}/upload/image`, { method: "POST", body: form });
  const body = (await res.json()) as { name?: string };
  if (!body.name) throw new BackendError("ComfyUI did not accept the uploaded image");
  return body.name;
}

async function queuePrompt(
  baseUrl: string,
  workflow: Record<string, unknown>,
): Promise<string> {
  const res = await request(`${baseUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
  });
  const body = (await res.json()) as { prompt_id?: string; error?: unknown };
  if (!body.prompt_id) {
    throw new BackendError(
      `ComfyUI rejected the workflow: ${JSON.stringify(body.error ?? body)}. ` +
        "Check that COMFYUI_CHECKPOINT and COMFYUI_CONTROLNET match files on the server.",
    );
  }
  return body.prompt_id;
}

/** Polls the history endpoint until the job produces images. */
async function awaitOutputs(
  baseUrl: string,
  promptId: string,
  timeoutMinutes: number,
): Promise<readonly ComfyImageRef[]> {
  const maxPolls = Math.ceil((timeoutMinutes * 60_000) / POLL_INTERVAL_MS);

  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    // no-store is essential: a cached /history response would repeat the same
    // "not ready" body forever and the render would appear to hang until the
    // timeout, with the job actually finished on the server.
    const res = await request(`${baseUrl}/history/${promptId}`, {
      cache: "no-store",
    });
    const history = (await res.json()) as Record<
      string,
      { outputs?: Record<string, { images?: ComfyImageRef[] }> }
    >;

    const entry = history[promptId];
    if (entry?.outputs) {
      const images = Object.values(entry.outputs).flatMap((o) => o.images ?? []);
      if (images.length > 0) return images;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new BackendError(
    `ComfyUI did not finish within ${timeoutMinutes} minutes. If the server is ` +
      "running on CPU rather than GPU this is expected - check its startup log " +
      "for 'Device: cuda'. Raise COMFYUI_TIMEOUT_MINUTES to wait longer.",
    504,
  );
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (cause) {
    throw new BackendError(
      `Cannot reach ComfyUI at ${url}. Is the server running? ` +
        `(${cause instanceof Error ? cause.message : String(cause)})`,
      503,
    );
  }
  if (!res.ok) {
    throw new BackendError(`ComfyUI responded ${res.status}: ${await res.text()}`);
  }
  return res;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
