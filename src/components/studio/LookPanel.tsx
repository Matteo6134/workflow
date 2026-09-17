"use client";

import {
  LIGHTING_PRESETS,
  MATERIAL_PRESETS,
  SCENE_PRESETS,
} from "@/lib/presets";
import type { PromptSelection } from "@/lib/presets/composePrompt";
import { PresetPicker } from "./PresetPicker";

type LookPanelProps = {
  readonly selection: PromptSelection;
  readonly onChange: (selection: PromptSelection) => void;
  readonly composedPrompt: string;
};

export function LookPanel({
  selection,
  onChange,
  composedPrompt,
}: LookPanelProps) {
  const patch = (next: Partial<PromptSelection>) =>
    onChange({ ...selection, ...next });

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[13.5px] font-medium tracking-[0.01em] text-dim">
          What is it?
        </span>
        <textarea
          value={selection.subject}
          onChange={(event) => patch({ subject: event.target.value })}
          rows={2}
          placeholder="a compact desk lamp with a perforated aluminium base"
          className="w-full resize-none rounded-md border border-line bg-raised px-2.5 py-2 text-[15px] leading-snug text-text outline-none placeholder:text-faint focus:border-accent"
        />
        <span className="mt-1 block text-[13px] leading-snug text-faint">
          Describe the object plainly. The lighting and material come from the
          presets below.
        </span>
      </label>

      <Section label="Material">
        <PresetPicker
          presets={MATERIAL_PRESETS}
          selectedId={selection.materialId}
          onSelect={(id) => patch({ materialId: id })}
        />
      </Section>

      <Section label="Lighting">
        <PresetPicker
          presets={LIGHTING_PRESETS}
          selectedId={selection.lightingId}
          onSelect={(id) => patch({ lightingId: id })}
        />
      </Section>

      <Section label="Background">
        <PresetPicker
          presets={SCENE_PRESETS}
          selectedId={selection.sceneId}
          onSelect={(id) => patch({ sceneId: id })}
        />
      </Section>

      <label className="block">
        <span className="mb-1.5 block text-[13.5px] font-medium tracking-[0.01em] text-dim">
          Anything else
        </span>
        <input
          type="text"
          value={selection.extra}
          onChange={(event) => patch({ extra: event.target.value })}
          placeholder="with a bright orange cable"
          className="w-full rounded-md border border-line bg-raised px-2.5 py-2 text-[15px] text-text outline-none placeholder:text-faint focus:border-accent"
        />
      </label>

      <details className="rounded-md border border-line bg-raised/50">
        <summary className="cursor-pointer px-2.5 py-2 text-[13.5px] text-dim transition-colors hover:text-text">
          Show the prompt this builds
        </summary>
        <p className="border-t border-line px-2.5 py-2 font-mono text-[13px] leading-relaxed text-faint">
          {composedPrompt || "Describe the object to build a prompt."}
        </p>
      </details>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[13.5px] font-medium tracking-[0.01em] text-dim">
        {label}
      </span>
      {children}
    </div>
  );
}
