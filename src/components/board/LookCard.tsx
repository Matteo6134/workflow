"use client";

import type { ReactNode } from "react";

import { Card } from "./Card";
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
}: LookCardProps) {
  return (
    <Card
      id="look"
      position={position}
      zoom={zoom}
      title="Look and render"
      badge="setup"
      width={330}
      onMove={onMove}
      onFocus={onFocus}
      menu={menu}
    >
      <div className="max-h-[460px] space-y-4 overflow-y-auto pr-1">
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
    </Card>
  );
}
