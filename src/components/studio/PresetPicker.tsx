"use client";

import type { Preset } from "@/lib/presets";

type PresetPickerProps = {
  readonly presets: readonly Preset[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
};

/**
 * Preset chips instead of a prompt box.
 *
 * This is the part that makes the tool usable by someone who designs products
 * but has never written a diffusion prompt: they pick "brushed aluminium", not
 * "anisotropic specular, 85mm, octane render".
 */
export function PresetPicker({ presets, selectedId, onSelect }: PresetPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {presets.map((preset) => {
        const selected = preset.id === selectedId;
        return (
          <button
            key={preset.id}
            type="button"
            // Clicking the active chip clears it, so any choice is undoable.
            onClick={() => onSelect(selected ? null : preset.id)}
            aria-pressed={selected}
            className={`rounded-md border px-2.5 py-2 text-left transition-colors ${
              selected
                ? "border-accent bg-[var(--accent-soft)]"
                : "border-line bg-surface-2 hover:border-surface-3 hover:bg-surface-3"
            }`}
          >
            <span className="block text-[15px] font-medium leading-tight text-text">
              {preset.label}
            </span>
            <span className="mt-0.5 block text-[13px] leading-tight text-faint">
              {preset.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
