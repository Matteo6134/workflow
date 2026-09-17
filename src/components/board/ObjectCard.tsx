"use client";

/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";

import { Card } from "./Card";
import { CardIcon } from "./CardIcon";
import type { Point } from "@/lib/board/boardState";
import type { SceneItem } from "@/lib/scene/sceneItem";

type ObjectCardProps = {
  readonly cardId: string;
  readonly item: SceneItem;
  readonly position: Point;
  readonly zoom: number;
  readonly selected: boolean;
  readonly onMove: (id: string, position: Point) => void;
  readonly onFocus: (id: string) => void;
  readonly onSelect: (itemId: string) => void;
  readonly onExpand: (itemId: string) => void;
  readonly onToggleVisible: (itemId: string) => void;
  readonly onToggleGhost: (itemId: string) => void;
  readonly onRemove: (itemId: string) => void;
  /** The "+" action menu rendered in this card's header. */
  readonly menu?: ReactNode;
  readonly onMeasure?: (
    id: string,
    size: { width: number; height: number },
  ) => void;
};

/**
 * A 3D object on the board.
 *
 * Double-clicking opens the positioning view: the card is a summary, and the
 * actual placement work needs a real viewport with a gizmo.
 */
export function ObjectCard({
  cardId,
  item,
  position,
  zoom,
  selected,
  onMove,
  onFocus,
  onSelect,
  onExpand,
  onToggleVisible,
  onToggleGhost,
  onRemove,
  menu,
  onMeasure,
}: ObjectCardProps) {
  const dims = item.dimensionsMm;

  return (
    <Card
      id={cardId}
      position={position}
      zoom={zoom}
      title={item.name}
      icon={<CardIcon kind={item.kind === "product" ? "product" : "part"} />}
      selected={selected}
      onMove={onMove}
      onFocus={(id) => {
        onFocus(id);
        onSelect(item.id);
      }}
      onDoubleClick={() => onExpand(item.id)}
      onRemove={() => onRemove(item.id)}
      menu={menu}
      onMeasure={onMeasure}
    >
      <button
        type="button"
        onDoubleClick={() => onExpand(item.id)}
        onClick={() => onSelect(item.id)}
        className={`block w-full overflow-hidden rounded-lg border border-line bg-black/40 transition-opacity ${
          item.visible ? "" : "opacity-35"
        }`}
        title="Double-click to position in 3D"
      >
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="aspect-square w-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center text-[13px] text-faint">
            no preview
          </div>
        )}
      </button>

      {dims ? (
        <p className="mt-2 font-mono text-[12px] text-faint">
          {fmt(dims.x)} x {fmt(dims.y)} x {fmt(dims.z)} mm
        </p>
      ) : null}

      <div className="mt-2 flex items-center gap-1">
        <SmallButton
          active={item.visible}
          label={item.visible ? "Visible" : "Hidden"}
          onClick={() => onToggleVisible(item.id)}
        />
        <SmallButton
          active={item.ghosted}
          label="X-ray"
          title="See through it, to show the parts inside"
          onClick={() => onToggleGhost(item.id)}
        />
        <button
          type="button"
          onClick={() => onExpand(item.id)}
          className="ml-auto rounded-md bg-raised-hi px-2 py-1 text-[13px] font-medium text-text transition-colors hover:bg-accent hover:text-accent-ink"
        >
          Position
        </button>
      </div>
    </Card>
  );
}

function SmallButton({
  active,
  label,
  title,
  onClick,
}: {
  readonly active: boolean;
  readonly label: string;
  readonly title?: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      aria-pressed={active}
      className={`rounded-md px-2 py-1 text-[13px] transition-colors ${
        active
          ? "bg-[rgba(199,247,81,0.16)] text-accent"
          : "bg-raised text-faint hover:text-text"
      }`}
    >
      {label}
    </button>
  );
}

function fmt(value: number): string {
  return value >= 100 ? value.toFixed(0) : value.toFixed(1);
}
