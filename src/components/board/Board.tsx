"use client";

import { useCallback, useRef, type ReactNode } from "react";
import type { BoardViewport, Point } from "@/lib/board/boardState";
import {
  collectWheelPath,
  wheelIntent,
  zoomFactorFor,
} from "@/lib/board/wheelTarget";

type BoardProps = {
  readonly viewport: BoardViewport;
  readonly onPan: (delta: Point) => void;
  readonly onZoom: (factor: number, screenPoint: Point) => void;
  readonly onBackgroundClick: () => void;
  readonly children: ReactNode;
};

/**
 * The pan/zoom surface everything sits on.
 *
 * The dot grid is drawn on the fixed backdrop rather than on the transformed
 * layer, and its spacing is scaled to match: that way the grid reads as an
 * infinite surface instead of a finite sheet that visibly ends when panned.
 */
export function Board({
  viewport,
  onPan,
  onZoom,
  onBackgroundClick,
  children,
}: BoardProps) {
  const panning = useRef(false);
  const moved = useRef(false);
  const last = useRef<Point>({ x: 0, y: 0 });

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    // Only start a pan from the background itself, never from a card.
    if (event.target !== event.currentTarget) return;
    panning.current = true;
    moved.current = false;
    last.current = { x: event.clientX, y: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!panning.current) return;
      const delta = {
        x: event.clientX - last.current.x,
        y: event.clientY - last.current.y,
      };
      if (Math.abs(delta.x) + Math.abs(delta.y) > 2) moved.current = true;
      last.current = { x: event.clientX, y: event.clientY };
      onPan(delta);
    },
    [onPan],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (!panning.current) return;
      panning.current = false;
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
      // A click that did not drag is a deselect, not the end of a pan.
      if (!moved.current) onBackgroundClick();
    },
    [onBackgroundClick],
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      const intent = wheelIntent({
        ctrlKey: event.ctrlKey,
        deltaY: event.deltaY,
        path: collectWheelPath(
          event.target as Element | null,
          event.currentTarget as Element,
        ),
      });

      // Anything a panel or scroller wants is left to the browser untouched.
      if (intent !== "zoom") return;

      const rect = event.currentTarget.getBoundingClientRect();
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      onZoom(zoomFactorFor(event.deltaY, event.deltaMode), point);
    },
    [onZoom],
  );

  const gridSize = 22 * viewport.zoom;

  return (
    <div
      className="absolute inset-0 cursor-grab overflow-hidden bg-canvas active:cursor-grabbing"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.055) 1px, transparent 0)",
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${viewport.pan.x}px ${viewport.pan.y}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
