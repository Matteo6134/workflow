"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { CARD_WIDTH, type Point } from "@/lib/board/boardState";

type CardProps = {
  readonly id: string;
  readonly position: Point;
  readonly zoom: number;
  readonly title: string;
  readonly badge?: string;
  readonly selected?: boolean;
  readonly width?: number;
  readonly onMove: (id: string, position: Point) => void;
  readonly onFocus: (id: string) => void;
  readonly onDoubleClick?: () => void;
  readonly onRemove?: () => void;
  /** The "+" action menu for this card. */
  readonly menu?: ReactNode;
  readonly children: ReactNode;
};

/**
 * Draggable card shell.
 *
 * Drag deltas are divided by the zoom so a card tracks the cursor exactly at
 * any zoom level - without that, dragging at 0.5x moves the card at half speed
 * and feels broken.
 */
export function Card({
  id,
  position,
  zoom,
  title,
  badge,
  selected = false,
  width = CARD_WIDTH,
  onMove,
  onFocus,
  onDoubleClick,
  onRemove,
  menu,
  children,
}: CardProps) {
  const dragging = useRef(false);
  const last = useRef<Point>({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.stopPropagation();
      dragging.current = true;
      last.current = { x: event.clientX, y: event.clientY };
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      onFocus(id);
    },
    [id, onFocus],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragging.current) return;
      const delta = {
        x: (event.clientX - last.current.x) / zoom,
        y: (event.clientY - last.current.y) / zoom,
      };
      last.current = { x: event.clientX, y: event.clientY };
      onMove(id, { x: position.x + delta.x, y: position.y + delta.y });
    },
    [id, onMove, position.x, position.y, zoom],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    dragging.current = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }, []);

  return (
    <div
      className={`glass absolute rounded-xl transition-shadow ${
        selected ? "accent-glow" : ""
      }`}
      style={{ left: position.x, top: position.y, width }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={onDoubleClick}
    >
      <header
        className="flex cursor-grab items-center gap-2 border-b border-line px-3 py-2 active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-text" title={title}>
          {title}
        </span>

        {badge ? (
          <span className="shrink-0 rounded-full bg-raised-hi px-1.5 py-0.5 font-mono text-[9px] text-dim">
            {badge}
          </span>
        ) : null}

        {menu}

        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            onPointerDown={(event) => event.stopPropagation()}
            title="Remove"
            aria-label="Remove"
            className="shrink-0 text-faint transition-colors hover:text-danger"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="m4 4 8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
      </header>

      <div className="p-3">{children}</div>
    </div>
  );
}
