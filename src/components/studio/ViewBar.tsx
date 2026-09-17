"use client";

import { VIEW_LABELS, type ViewDirection } from "@/lib/three/framing";

type ViewBarProps = {
  readonly onFrame: (direction: ViewDirection) => void;
  readonly disabled: boolean;
};

const ORDER: readonly ViewDirection[] = [
  "iso",
  "front",
  "back",
  "left",
  "right",
  "top",
];

/**
 * Camera shortcuts. These re-frame rather than just re-orient, so the product
 * fills the frame consistently from every angle - which is what makes a set of
 * renders look like one shoot instead of six unrelated pictures.
 */
export function ViewBar({ onFrame, disabled }: ViewBarProps) {
  return (
    <div className="glass pointer-events-auto flex items-center gap-0.5 rounded-xl p-1">
      {ORDER.map((direction) => (
        <button
          key={direction}
          type="button"
          disabled={disabled}
          onClick={() => onFrame(direction)}
          title={`${VIEW_LABELS[direction]} view`}
          className="rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium text-dim transition-colors hover:bg-raised-hi hover:text-text disabled:cursor-not-allowed disabled:opacity-35"
        >
          {VIEW_LABELS[direction]}
        </button>
      ))}
    </div>
  );
}
