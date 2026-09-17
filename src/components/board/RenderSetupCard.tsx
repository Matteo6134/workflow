"use client";

import type { ReactNode } from "react";
import { Card } from "./Card";
import { CardIcon } from "./CardIcon";
import { RenderPanel } from "@/components/studio/RenderPanel";
import type { Point } from "@/lib/board/boardState";
import type { RenderSettings } from "@/lib/types";

type RenderSetupCardProps = {
  readonly position: Point;
  readonly zoom: number;
  readonly settings: RenderSettings;
  readonly onChange: (settings: RenderSettings) => void;
  readonly onRender: () => void;
  readonly onInspect: () => void;
  readonly canRender: boolean;
  readonly rendering: boolean;
  readonly blockedReason: string | null;
  readonly onMove: (id: string, position: Point) => void;
  readonly onFocus: (id: string) => void;
  readonly onMeasure?: (
    id: string,
    size: { width: number; height: number },
  ) => void;
  readonly menu?: ReactNode;
  readonly deleteMenu?: ReactNode;
};

/** Step three: the mechanical settings, and the button that spends money. */
export function RenderSetupCard({
  position,
  zoom,
  settings,
  onChange,
  onRender,
  onInspect,
  canRender,
  rendering,
  blockedReason,
  onMove,
  onFocus,
  onMeasure,
  menu,
  deleteMenu,
}: RenderSetupCardProps) {
  return (
    <Card
      id="render"
      position={position}
      zoom={zoom}
      title="Render"
      icon={<CardIcon kind="render" />}
      width={360}
      onMove={onMove}
      onFocus={onFocus}
      onMeasure={onMeasure}
      menu={menu}
      deleteMenu={deleteMenu}
    >
      <RenderPanel
        settings={settings}
        onChange={onChange}
        onRender={onRender}
        onInspect={onInspect}
        canRender={canRender}
        rendering={rendering}
        blockedReason={blockedReason}
      />
    </Card>
  );
}
