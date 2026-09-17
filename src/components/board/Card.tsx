"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { CARD_WIDTH, type Point } from "@/lib/board/boardState";
import { CARD_ATTR } from "@/lib/board/wheelTarget";

type CardProps = {
  readonly id: string;
  readonly position: Point;
  readonly zoom: number;
  readonly title: string;
  /** Leading icon, so the card type is readable at board zoom. */
  readonly icon?: ReactNode;
  readonly badge?: string;
  readonly selected?: boolean;
  readonly width?: number;
  readonly onMove: (id: string, position: Point) => void;
  readonly onFocus: (id: string) => void;
  readonly onDoubleClick?: () => void;
  /** The "+" action menu for this card. */
  readonly menu?: ReactNode;
  /** The destructive menu, shown as a round red cross on the left edge. */
  readonly deleteMenu?: ReactNode;
  /** Reports the rendered size, so connector wires can anchor to real edges. */
  readonly onMeasure?: (id: string, size: { width: number; height: number }) => void;
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
  icon,
  badge,
  selected = false,
  width = CARD_WIDTH,
  onMove,
  onFocus,
  onDoubleClick,
  menu,
  deleteMenu,
  onMeasure,
  children,
}: CardProps) {
  const dragging = useRef(false);
  const last = useRef<Point>({ x: 0, y: 0 });
  const rootRef = useRef<HTMLDivElement>(null);

  // Card height depends on its content, so it is measured rather than assumed;
  // a guessed height would leave wires floating off the card edge.
  useEffect(() => {
    const node = rootRef.current;
    if (!node || !onMeasure) return;

    const report = () =>
      onMeasure(id, {
        width: node.offsetWidth,
        height: node.offsetHeight,
      });

    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [id, onMeasure]);

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
      ref={rootRef}
      // Cards keep the wheel; only the bare board zooms.
      {...{ [CARD_ATTR]: "true" }}
      /*
       * Hovering lifts the card above its siblings. Without this the "+"
       * popover, which opens outward past the card edge, renders underneath
       * the next card along - each panel is its own stacking context, so a
       * z-index inside one cannot beat a sibling.
       */
      className={`glass backdrop-blur-2xl backdrop-saturate-150 group absolute z-10 rounded-xl transition-shadow hover:z-40 focus-within:z-40 ${
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
        {icon ? (
          <span className="shrink-0 text-accent" aria-hidden>
            {icon}
          </span>
        ) : null}

        <span
          className="min-w-0 flex-1 truncate text-[16px] font-medium text-text"
          title={title}
        >
          {title}
        </span>

        {/* On the title row, revealed with the card. Expanding it is a second,
            deliberate hover, so deletion is never one stray click. */}
        {deleteMenu ? (
          <div
            className="opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100"
            onPointerDown={(event) => event.stopPropagation()}
          >
            {deleteMenu}
          </div>
        ) : null}

        {badge ? (
          <span className="shrink-0 rounded-full bg-raised-hi px-1.5 py-0.5 font-mono text-[12px] text-dim">
            {badge}
          </span>
        ) : null}

      </header>

      <div className="p-3">{children}</div>

      {/*
        Sits on the right edge, clear of the wire that leaves at mid-height, and
        appears on hover so a board full of cards is not a wall of buttons.
        focus-within keeps it reachable by keyboard, where hover does not exist.
      */}
      {menu ? (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
          {menu}
        </div>
      ) : null}


    </div>
  );
}
