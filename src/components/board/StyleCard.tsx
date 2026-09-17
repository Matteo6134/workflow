"use client";

import { useState, type ReactNode } from "react";
import { Card } from "./Card";
import { CardIcon } from "./CardIcon";
import { PresetPicker } from "@/components/studio/PresetPicker";
import {
  LIGHTING_PRESETS,
  MATERIAL_PRESETS,
  SCENE_PRESETS,
  findPreset,
  type Preset,
} from "@/lib/presets";
import type { Point } from "@/lib/board/boardState";
import type { PromptSelection } from "@/lib/presets/composePrompt";

type StyleCardProps = {
  readonly position: Point;
  readonly zoom: number;
  readonly selection: PromptSelection;
  readonly onChange: (selection: PromptSelection) => void;
  readonly onMove: (id: string, position: Point) => void;
  readonly onFocus: (id: string) => void;
  readonly onMeasure?: (
    id: string,
    size: { width: number; height: number },
  ) => void;
  readonly menu?: ReactNode;
  readonly deleteMenu?: ReactNode;
};

type Facet = "material" | "lighting" | "scene";

const FACETS: readonly { id: Facet; label: string; presets: readonly Preset[] }[] = [
  { id: "material", label: "Material", presets: MATERIAL_PRESETS },
  { id: "lighting", label: "Light", presets: LIGHTING_PRESETS },
  { id: "scene", label: "Background", presets: SCENE_PRESETS },
];

/**
 * Step two: how it should look.
 *
 * One facet at a time rather than three stacked lists. Showing all twenty
 * presets at once is what made the old panel unusably tall, and you only
 * choose one of each anyway. The tabs carry the current choice in their label,
 * so nothing is hidden by collapsing them.
 */
export function StyleCard({
  position,
  zoom,
  selection,
  onChange,
  onMove,
  onFocus,
  onMeasure,
  menu,
  deleteMenu,
}: StyleCardProps) {
  const [facet, setFacet] = useState<Facet>("material");

  const selectedId: Record<Facet, string | null> = {
    material: selection.materialId,
    lighting: selection.lightingId,
    scene: selection.sceneId,
  };

  const apply = (id: string | null) => {
    if (facet === "material") onChange({ ...selection, materialId: id });
    else if (facet === "lighting") onChange({ ...selection, lightingId: id });
    else onChange({ ...selection, sceneId: id });
  };

  const active = FACETS.find((f) => f.id === facet) ?? FACETS[0];

  return (
    <Card
      id="style"
      position={position}
      zoom={zoom}
      title="Style"
      icon={<CardIcon kind="look" />}
      width={400}
      onMove={onMove}
      onFocus={onFocus}
      onMeasure={onMeasure}
      menu={menu}
      deleteMenu={deleteMenu}
    >
      <div className="space-y-3">
        <div className="flex gap-1">
          {FACETS.map((option) => {
            const chosen = findPreset(option.presets, selectedId[option.id]);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFacet(option.id)}
                className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-left transition-colors ${
                  option.id === facet
                    ? "bg-raised-hi"
                    : "bg-raised/60 hover:bg-raised-hi"
                }`}
              >
                <span
                  className={`block text-[13.5px] font-medium ${
                    option.id === facet ? "text-text" : "text-dim"
                  }`}
                >
                  {option.label}
                </span>
                {/* The current choice stays visible, so switching tabs never
                    hides a decision you already made. */}
                <span
                  className={`block truncate text-[12px] ${
                    chosen ? "text-accent" : "text-faint"
                  }`}
                >
                  {chosen ? chosen.label : "any"}
                </span>
              </button>
            );
          })}
        </div>

        <PresetPicker
          presets={active.presets}
          selectedId={selectedId[active.id]}
          onSelect={apply}
        />
      </div>
    </Card>
  );
}
