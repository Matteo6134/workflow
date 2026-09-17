"use client";

import { useMemo } from "react";
import { buildWires, type Connection, type Rect } from "@/lib/board/connections";

type ConnectorsProps = {
  readonly connections: readonly Connection[];
  readonly rects: Readonly<Record<string, Rect>>;
  /** Animates the wires while a render is actually in flight. */
  readonly active: boolean;
};

/**
 * The wires between cards.
 *
 * Drawn as a wiring diagram rather than decoration, which suits a tool for
 * fitting electronics into enclosures: each wire terminates in a round port at
 * the card edge, like a pad on a board. The flow animation runs only while a
 * render is in progress, so motion always reports something real.
 *
 * Sits inside the board's transformed layer, so it pans and zooms with the
 * cards, and is pointer-transparent so it never intercepts a drag.
 */
export function Connectors({ connections, rects, active }: ConnectorsProps) {
  const wires = useMemo(
    () => buildWires(connections, rects),
    [connections, rects],
  );

  if (wires.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      width="1"
      height="1"
      aria-hidden
    >
      <defs>
        <linearGradient id="wire-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--line-strong)" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {wires.map((wire) => (
        <g key={wire.id} opacity={wire.muted ? 0.25 : 1}>
          {/* A soft under-stroke lifts the wire off the dot grid without
              resorting to a drop shadow, which would blur at high zoom. */}
          <path
            d={wire.d}
            fill="none"
            stroke="var(--canvas)"
            strokeWidth={6}
            strokeLinecap="round"
          />
          <path
            d={wire.d}
            fill="none"
            stroke="url(#wire-gradient)"
            strokeWidth={2}
            strokeLinecap="round"
            className={active ? "wire-flow" : undefined}
          />

          <Port point={wire.start} />
          <Port point={wire.end} filled />
        </g>
      ))}
    </svg>
  );
}

/** A connection pad. Filled at the receiving end, so direction is readable. */
function Port({
  point,
  filled = false,
}: {
  readonly point: { readonly x: number; readonly y: number };
  readonly filled?: boolean;
}) {
  return (
    <>
      <circle cx={point.x} cy={point.y} r={5} fill="var(--canvas)" />
      <circle
        cx={point.x}
        cy={point.y}
        r={4}
        fill={filled ? "var(--accent)" : "var(--panel-solid)"}
        stroke="var(--accent)"
        strokeWidth={1.5}
      />
    </>
  );
}
