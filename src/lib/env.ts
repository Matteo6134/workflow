/**
 * Single place where environment variables are read.
 * Nothing else in the app touches `process.env`, so misconfiguration is
 * diagnosed in one spot instead of failing deep inside a request.
 */

export type BackendId = "fal" | "comfy";

function str(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export const env = {
  /** Which inference engine to use. Flip this one value to move to your GPU. */
  backend: (str("RENDER_BACKEND") ?? "fal") as BackendId,

  falKey: str("FAL_KEY"),

  comfyUrl: str("COMFYUI_URL"),
  comfyCheckpoint: str("COMFYUI_CHECKPOINT") ?? "sd_xl_base_1.0.safetensors",
  comfyControlNet:
    str("COMFYUI_CONTROLNET") ?? "controlnet-depth-sdxl-1.0.safetensors",
  comfyControlNetCanny:
    str("COMFYUI_CONTROLNET_CANNY") ?? "controlnet-canny-sdxl-1.0.safetensors",
  comfyTimeoutMinutes: Number(str("COMFYUI_TIMEOUT_MINUTES") ?? "") || undefined,

  instagram: {
    userId: str("IG_USER_ID"),
    accessToken: str("IG_ACCESS_TOKEN"),
    graphVersion: str("IG_GRAPH_VERSION") ?? "v21.0",
    // "instagram" needs no Facebook Page, so it is the friendlier default.
    loginType: (str("IG_LOGIN_TYPE") ?? "instagram") as
      | "instagram"
      | "facebook",
  },
} as const;
