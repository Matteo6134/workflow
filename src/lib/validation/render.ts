import { z } from "zod";

/**
 * Boundary validation. Nothing reaches a backend without passing through here,
 * so a malformed client request fails fast with a clear message instead of
 * turning into a confusing upstream API error.
 */

const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

const dataUrl = (label: string) =>
  z
    .string()
    .regex(DATA_URL, `${label} must be a base64 PNG/JPEG/WebP data URL`);

/**
 * The control passes. `mask` is absent on purpose - it is used in the browser
 * to verify the silhouette and must never be uploaded.
 */
export const capturePassesSchema = z.object({
  beauty: dataUrl("beauty pass"),
  depth: dataUrl("depth pass"),
  normal: dataUrl("normal pass"),
  edge: dataUrl("edge pass"),
});

export const imageSizeSchema = z.enum([
  "square_hd",
  "portrait_4_3",
  "portrait_16_9",
  "landscape_4_3",
  "landscape_16_9",
]);

export const renderSettingsSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, "Describe the lighting, material and background you want")
    .max(2000),
  negativePrompt: z.string().max(2000).default(""),
  shapeFidelity: z.number().min(0).max(1),
  creativeFreedom: z.number().min(0).max(1),
  steps: z.number().int().min(1).max(60),
  guidance: z.number().min(0).max(20),
  numImages: z.number().int().min(1).max(4),
  imageSize: imageSizeSchema,
  // Only the tiers the UI offers; an arbitrary size would break the /64 rule
  // that ControlNet conditioning relies on.
  resolution: z.union([z.literal(512), z.literal(768), z.literal(1024)]),
  seed: z.number().int().min(0).optional(),
});

export const renderRequestSchema = z.object({
  passes: capturePassesSchema,
  settings: renderSettingsSchema,
});

export type RenderRequestInput = z.infer<typeof renderRequestSchema>;

/** Instagram captions cap at 2200 characters and 30 hashtags. */
export const publishRequestSchema = z.object({
  imageUrl: z.string().url("A publicly reachable image URL is required"),
  caption: z
    .string()
    .max(2200, "Instagram captions are limited to 2200 characters")
    .default(""),
});

export type PublishRequestInput = z.infer<typeof publishRequestSchema>;
