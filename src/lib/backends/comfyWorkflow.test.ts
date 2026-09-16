import { describe, expect, it } from "vitest";
import { buildComfyWorkflow, resolveSize } from "./comfyWorkflow";
import type { RenderSettings } from "@/lib/types";

const settings: RenderSettings = {
  prompt: "a matte black speaker",
  negativePrompt: "blurry",
  shapeFidelity: 0.7,
  creativeFreedom: 0.8,
  steps: 30,
  guidance: 7,
  numImages: 1,
  imageSize: "portrait_4_3",
  resolution: 1024,
};

function build() {
  return buildComfyWorkflow({
    beautyImageName: "beauty.png",
    depthImageName: "depth.png",
    edgeImageName: "edge.png",
    settings,
    seed: 1234,
    models: {
      checkpoint: "sdxl.safetensors",
      controlNet: "depth.safetensors",
      controlNetCanny: "canny.safetensors",
    },
  });
}

type Node = { class_type: string; inputs: Record<string, unknown> };

describe("buildComfyWorkflow", () => {
  it("maps shape fidelity onto both ControlNet strengths", () => {
    const workflow = build();
    for (const id of ["10", "17"]) {
      const controlNet = workflow[id] as Node;
      expect(controlNet.class_type).toBe("ControlNetApplyAdvanced");
      expect(controlNet.inputs.strength).toBe(0.7);
    }
  });

  it("chains the edge ControlNet after the depth one", () => {
    const workflow = build();
    const edgeControl = workflow["17"] as Node;
    // Consumes the depth ControlNet's conditioning rather than replacing it.
    expect(edgeControl.inputs.positive).toEqual(["10", 0]);
    expect(edgeControl.inputs.negative).toEqual(["10", 1]);
    expect((workflow["14"] as Node).inputs.image).toBe("edge.png");
    expect((workflow["16"] as Node).inputs.control_net_name).toBe("canny.safetensors");
  });

  it("maps creative freedom onto the sampler denoise", () => {
    const sampler = build()["11"] as Node;
    expect(sampler.class_type).toBe("KSampler");
    // Reads the final link in the ControlNet chain.
    expect(sampler.inputs.positive).toEqual(["17", 0]);
    expect(sampler.inputs.denoise).toBe(0.8);
    expect(sampler.inputs.seed).toBe(1234);
    expect(sampler.inputs.steps).toBe(30);
  });

  it("feeds the depth map in untouched, since it comes from real geometry", () => {
    const workflow = build();
    const depthLoader = workflow["5"] as Node;
    const controlNet = workflow["10"] as Node;

    expect(depthLoader.inputs.image).toBe("depth.png");
    // Node 7 is the resize of the depth image - no preprocessor in between.
    expect(controlNet.inputs.image).toEqual(["7", 0]);
  });

  it("uses the beauty pass as the img2img latent", () => {
    const workflow = build();
    const encode = workflow["8"] as Node;
    const sampler = workflow["11"] as Node;

    expect(encode.class_type).toBe("VAEEncode");
    expect(sampler.inputs.latent_image).toEqual(["8", 0]);
  });

  it("resizes every pass to the selected output dimensions", () => {
    const workflow = build();
    for (const id of ["6", "7", "15"]) {
      const scale = workflow[id] as Node;
      // portrait_4_3 (4:5) at the 1024 tier: shorter side 1024 -> 1024x1280.
      expect(scale.inputs.width).toBe(1024);
      expect(scale.inputs.height).toBe(1280);
    }
  });

  it("wires the chosen checkpoint and controlnet files", () => {
    const workflow = build();
    expect((workflow["1"] as Node).inputs.ckpt_name).toBe("sdxl.safetensors");
    expect((workflow["9"] as Node).inputs.control_net_name).toBe("depth.safetensors");
  });

  it("returns a fresh graph each call so no state leaks between renders", () => {
    expect(build()).not.toBe(build());
    expect(build()).toEqual(build());
  });
});

describe("resolveSize", () => {
  it("resolves an aspect at the SDXL tier", () => {
    expect(resolveSize("square_hd", 1024)).toEqual([1024, 1024]);
  });

  /** SD 1.5 on a small GPU needs the smaller tiers to fit in VRAM. */
  it("resolves the same aspect smaller for SD 1.5", () => {
    expect(resolveSize("square_hd", 512)).toEqual([512, 512]);
    const [w, h] = resolveSize("landscape_16_9", 512);
    expect(Math.min(w, h)).toBe(512);
    expect(w).toBeGreaterThan(h);
  });
});
