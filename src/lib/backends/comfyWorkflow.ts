import type { RenderSettings } from "@/lib/types";
import { dimensionsFor } from "@/lib/imageSize";

/**
 * ComfyUI "API format" workflow: SDXL img2img driven by a depth ControlNet.
 *
 * Node names must match the checkpoint/ControlNet files present on YOUR ComfyUI
 * server, so both are configurable via env rather than hard-coded.
 */
export type ComfyModelConfig = {
  readonly checkpoint: string;
  /** Depth ControlNet checkpoint. */
  readonly controlNet: string;
  /** Canny/line ControlNet, used for the geometry lock. */
  readonly controlNetCanny: string;
};

export type ComfyWorkflowInput = {
  readonly beautyImageName: string;
  readonly depthImageName: string;
  readonly edgeImageName: string;
  readonly settings: RenderSettings;
  readonly seed: number;
  readonly models: ComfyModelConfig;
};

export function resolveSize(
  preset: RenderSettings["imageSize"],
  resolution: RenderSettings["resolution"],
): readonly [number, number] {
  return dimensionsFor(preset, resolution);
}

/**
 * Builds the node graph. Returned fresh each call - never mutated in place.
 */
export function buildComfyWorkflow(
  input: ComfyWorkflowInput,
): Record<string, unknown> {
  const { beautyImageName, depthImageName, edgeImageName, settings, seed, models } =
    input;
  const [width, height] = resolveSize(settings.imageSize, settings.resolution);

  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: models.checkpoint },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: settings.prompt, clip: ["1", 1] },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: { text: settings.negativePrompt, clip: ["1", 1] },
    },
    "4": { class_type: "LoadImage", inputs: { image: beautyImageName } },
    "5": { class_type: "LoadImage", inputs: { image: depthImageName } },
    "6": {
      class_type: "ImageScale",
      inputs: {
        image: ["4", 0],
        width,
        height,
        upscale_method: "lanczos",
        crop: "center",
      },
    },
    "7": {
      class_type: "ImageScale",
      inputs: {
        image: ["5", 0],
        width,
        height,
        upscale_method: "lanczos",
        crop: "center",
      },
    },
    "8": {
      class_type: "VAEEncode",
      inputs: { pixels: ["6", 0], vae: ["1", 2] },
    },
    "9": {
      class_type: "ControlNetLoader",
      inputs: { control_net_name: models.controlNet },
    },
    "10": {
      class_type: "ControlNetApplyAdvanced",
      inputs: {
        positive: ["2", 0],
        negative: ["3", 0],
        control_net: ["9", 0],
        // Our depth map comes from real geometry, so it is used as-is.
        image: ["7", 0],
        strength: settings.shapeFidelity,
        start_percent: 0,
        end_percent: 1,
      },
    },
    "14": { class_type: "LoadImage", inputs: { image: edgeImageName } },
    "15": {
      class_type: "ImageScale",
      inputs: {
        image: ["14", 0],
        width,
        height,
        upscale_method: "lanczos",
        crop: "center",
      },
    },
    "16": {
      class_type: "ControlNetLoader",
      inputs: { control_net_name: models.controlNetCanny },
    },
    // Chained after the depth ControlNet: depth gives form, the line drawing
    // pins the silhouette and hard edges to the real CAD.
    "17": {
      class_type: "ControlNetApplyAdvanced",
      inputs: {
        positive: ["10", 0],
        negative: ["10", 1],
        control_net: ["16", 0],
        image: ["15", 0],
        strength: settings.shapeFidelity,
        start_percent: 0,
        end_percent: 1,
      },
    },
    "11": {
      class_type: "KSampler",
      inputs: {
        model: ["1", 0],
        positive: ["17", 0],
        negative: ["17", 1],
        latent_image: ["8", 0],
        seed,
        steps: settings.steps,
        cfg: settings.guidance,
        sampler_name: "dpmpp_2m",
        scheduler: "karras",
        denoise: settings.creativeFreedom,
      },
    },
    "12": {
      class_type: "VAEDecode",
      inputs: { samples: ["11", 0], vae: ["1", 2] },
    },
    "13": {
      class_type: "SaveImage",
      inputs: { images: ["12", 0], filename_prefix: "studio" },
    },
  };
}
