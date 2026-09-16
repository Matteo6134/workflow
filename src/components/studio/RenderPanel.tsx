"use client";

import { Slider, asPercent } from "@/components/ui/Slider";
import type { ImageSizePreset, RenderSettings } from "@/lib/types";
import { RESOLUTIONS, dimensionsFor } from "@/lib/imageSize";

type RenderPanelProps = {
  readonly settings: RenderSettings;
  readonly onChange: (settings: RenderSettings) => void;
  readonly onRender: () => void;
  readonly onInspect: () => void;
  readonly canRender: boolean;
  readonly rendering: boolean;
  readonly blockedReason: string | null;
};

const SIZES: readonly { id: ImageSizePreset; label: string; hint: string }[] = [
  { id: "square_hd", label: "1:1", hint: "Feed post" },
  { id: "portrait_4_3", label: "4:5", hint: "Feed, taller" },
  { id: "portrait_16_9", label: "9:16", hint: "Story / Reel" },
  { id: "landscape_4_3", label: "4:3", hint: "Web" },
  { id: "landscape_16_9", label: "16:9", hint: "Banner" },
];

export function RenderPanel({
  settings,
  onChange,
  onRender,
  onInspect,
  canRender,
  rendering,
  blockedReason,
}: RenderPanelProps) {
  const patch = (next: Partial<RenderSettings>) =>
    onChange({ ...settings, ...next });

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wide text-dim">
          Format
        </span>
        <div className="grid grid-cols-5 gap-1">
          {SIZES.map((size) => (
            <button
              key={size.id}
              type="button"
              title={size.hint}
              onClick={() => patch({ imageSize: size.id })}
              className={`rounded-md px-1 py-1.5 text-[10.5px] font-medium transition-colors ${
                size.id === settings.imageSize
                  ? "bg-accent text-accent-ink"
                  : "bg-raised text-dim hover:bg-raised-hi hover:text-text"
              }`}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[10.5px] font-medium uppercase tracking-wide text-dim">
            Resolution
          </span>
          <span className="font-mono text-[9.5px] text-faint">
            {dimensionsFor(settings.imageSize, settings.resolution).join(" x ")}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {RESOLUTIONS.map((value) => (
            <button
              key={value}
              type="button"
              // Resolution is a hardware choice: SD 1.5 on a 6 GB card wants
              // 512-768, while SDXL wants 1024.
              title={
                value === 512
                  ? "SD 1.5 / small GPU - fastest"
                  : value === 768
                    ? "Balanced"
                    : "SDXL - sharpest, needs more VRAM"
              }
              onClick={() => patch({ resolution: value })}
              className={`rounded-md px-1 py-1.5 text-[10.5px] font-medium transition-colors ${
                value === settings.resolution
                  ? "bg-accent text-accent-ink"
                  : "bg-raised text-dim hover:bg-raised-hi hover:text-text"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <Slider
        label="Shape fidelity"
        hint="How tightly the render follows your actual geometry. Keep this high so dimensions stay true."
        value={settings.shapeFidelity}
        min={0.2}
        max={1}
        step={0.01}
        format={asPercent}
        onChange={(shapeFidelity) => patch({ shapeFidelity })}
      />

      <Slider
        label="Creative freedom"
        hint="How far the materials and lighting may depart from the flat viewport shading."
        value={settings.creativeFreedom}
        min={0.3}
        max={1}
        step={0.01}
        format={asPercent}
        onChange={(creativeFreedom) => patch({ creativeFreedom })}
      />

      {settings.shapeFidelity < 0.5 ? (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-2 py-1.5 text-[10px] leading-snug text-danger">
          Below about 50% the model starts reshaping the product. Raise it if the
          render must match what you manufacture.
        </p>
      ) : null}

      <Slider
        label="Variations"
        hint="More options to choose from, at proportionally more cost per run."
        value={settings.numImages}
        min={1}
        max={4}
        step={1}
        format={(v) => `${v}`}
        onChange={(numImages) => patch({ numImages })}
      />

      <details className="rounded-md border border-line bg-raised/50">
        <summary className="cursor-pointer px-2.5 py-2 text-[10.5px] text-dim transition-colors hover:text-text">
          Advanced
        </summary>
        <div className="space-y-3 border-t border-line px-2.5 py-3">
          <Slider
            label="Steps"
            value={settings.steps}
            min={10}
            max={60}
            step={1}
            format={(v) => `${v}`}
            onChange={(steps) => patch({ steps })}
          />
          <Slider
            label="Guidance"
            value={settings.guidance}
            min={1}
            max={15}
            step={0.5}
            format={(v) => v.toFixed(1)}
            onChange={(guidance) => patch({ guidance })}
          />
          <label className="block">
            <span className="text-[13px] font-medium text-text">Negative prompt</span>
            <textarea
              value={settings.negativePrompt}
              onChange={(event) => patch({ negativePrompt: event.target.value })}
              rows={2}
              className="mt-1.5 w-full resize-none rounded-md border border-line bg-raised px-2 py-1.5 font-mono text-[10px] leading-snug text-text outline-none focus:border-accent"
            />
            <span className="mt-1 block text-[10px] leading-snug text-faint">
              Geometry protection is always appended on the server and cannot be
              removed here.
            </span>
          </label>
        </div>
      </details>

      {/* Sticky within the scrolling rail: the primary action must never be
          below the fold behind a long list of presets. */}
      <div className="sticky bottom-0 -mx-3.5 -mb-3.5 space-y-1.5 border-t border-line bg-panel-solid px-3.5 pb-3.5 pt-3">
        <button
          type="button"
          onClick={onRender}
          disabled={!canRender || rendering}
          title={blockedReason ?? undefined}
          className="w-full rounded-lg bg-accent px-3 py-2.5 text-[13px] font-semibold text-accent-ink transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:bg-raised disabled:text-faint"
        >
          {rendering ? "Rendering..." : "Render"}
        </button>

        <button
          type="button"
          onClick={onInspect}
          disabled={rendering}
          className="w-full rounded-lg border border-line px-3 py-1.5 text-[11px] text-dim transition-colors hover:border-line-strong hover:text-text disabled:opacity-40"
        >
          See what the AI gets
        </button>

        {blockedReason && !rendering ? (
          <p className="text-[10.5px] leading-snug text-faint">{blockedReason}</p>
        ) : null}
      </div>
    </div>
  );
}
