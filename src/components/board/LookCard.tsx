"use client";

import type { ReactNode } from "react";

import { Card } from "./Card";
import { CardIcon } from "./CardIcon";
import { LookPanel } from "@/components/studio/LookPanel";
import { RenderPanel } from "@/components/studio/RenderPanel";
import type { Point } from "@/lib/board/boardState";
import type { PromptSelection } from "@/lib/presets/composePrompt";
import type { RenderSettings } from "@/lib/types";

type LookCardProps = {
  readonly position: Point;
  readonly zoom: number;
  readonly selection: PromptSelection;
  readonly onSelectionChange: (selection: PromptSelection) => void;
  readonly composedPrompt: string;
  readonly settings: RenderSettings;
  readonly onSettingsChange: (settings: RenderSettings) => void;
  readonly onRender: () => void;
  readonly onInspect: () => void;
  readonly canRender: boolean;
  readonly rendering: boolean;
  readonly blockedReason: string | null;
  readonly onMove: (id: string, position: Point) => void;
  readonly onFocus: (id: string) => void;
  readonly menu?: ReactNode;
  readonly onMeasure?: (
    id: string,
    size: { width: number; height: number },
  ) => void;
};

/**
 * The card that turns a staged 3D scene into an image: what the product is,
 * how it should look, and the render controls.
 */
export function LookCard({
  position,
  zoom,
  selection,
  onSelectionChange,
  composedPrompt,
  settings,
  onSettingsChange,
  onRender,
  onInspect,
  canRender,
  rendering,
  blockedReason,
  onMove,
  onFocus,
  menu,
  onMeasure,
}: LookCardProps) {
  return (
    <Card
      id="look"
      position={position}
      zoom={zoom}
      title="Look and render"
      icon={<CardIcon kind="look" />}
      width={420}
      onMove={onMove}
      onFocus={onFocus}
      menu={menu}
      onMeasure={onMeasure}
    >
      {/* The fade tells you there is more below. Without it the card simply
          stops mid-section and reads as broken. */}
      <div className="relative">
        <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
        <LookPanel
          selection={selection}
          onChange={onSelectionChange}
          composedPrompt={composedPrompt}
        />

        <div className="border-t border-line pt-3">
          <RenderPanel
            settings={settings}
            onChange={onSettingsChange}
            onRender={onRender}
            onInspect={onInspect}
            canRender={canRender}
            rendering={rendering}
            blockedReason={blockedReason}
          />
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-xl bg-gradient-to-t from-[var(--panel-solid)] to-transparent"
          aria-hidden
        />
      </div>
    </Card>
  );
}
