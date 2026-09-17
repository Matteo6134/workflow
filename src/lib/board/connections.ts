import type { Point } from "./boardState";

/**
 * Geometry for the wires that link cards on the board.
 *
 * Kept pure so the curve behaviour can be tested without a DOM: the tricky
 * cases (a card dragged above, below, or to the LEFT of its source) are exactly
 * the ones that look wrong and are hardest to check by eye.
 */

export type Rect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/** A wire from one card to another. */
export type Connection = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  /** Dim the wire when the source contributes nothing to the render. */
  readonly muted?: boolean;
};

export type WirePath = {
  readonly id: string;
  readonly d: string;
  readonly start: Point;
  readonly end: Point;
  readonly muted: boolean;
};

/** Wires leave the right edge and arrive at the left edge. */
function exitPort(rect: Rect): Point {
  return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
}

function entryPort(rect: Rect): Point {
  return { x: rect.x, y: rect.y + rect.height / 2 };
}

const MIN_BOW = 48;
const MAX_BOW = 220;
/** Extra bow when the target sits behind the source, so the wire reads as a loop. */
const BACKWARD_BOW = 160;

/**
 * Horizontal control-point offset.
 *
 * Proportional to the gap so short hops stay taut and long ones bow gently. A
 * fixed offset makes distant cards look tethered by a straight line and close
 * ones bulge absurdly.
 */
export function bowFor(from: Point, to: Point): number {
  const gap = to.x - from.x;
  if (gap < 0) return BACKWARD_BOW + Math.abs(gap) * 0.15;
  return Math.min(MAX_BOW, Math.max(MIN_BOW, gap * 0.5));
}

/** Cubic bezier leaving horizontally and arriving horizontally. */
export function wireBetween(fromRect: Rect, toRect: Rect): Omit<WirePath, "id" | "muted"> {
  const start = exitPort(fromRect);
  const end = entryPort(toRect);
  const bow = bowFor(start, end);

  const d = [
    `M ${round(start.x)} ${round(start.y)}`,
    `C ${round(start.x + bow)} ${round(start.y)}`,
    `${round(end.x - bow)} ${round(end.y)}`,
    `${round(end.x)} ${round(end.y)}`,
  ].join(" ");

  return { d, start, end };
}

/**
 * Builds every drawable wire.
 *
 * A connection whose endpoints are not both measured yet is skipped rather than
 * drawn at a guessed position — a wire that snaps into place on the next frame
 * is more distracting than one that appears a moment late.
 */
export function buildWires(
  connections: readonly Connection[],
  rects: Readonly<Record<string, Rect>>,
): readonly WirePath[] {
  const wires: WirePath[] = [];

  for (const connection of connections) {
    const fromRect = rects[connection.from];
    const toRect = rects[connection.to];
    if (!fromRect || !toRect) continue;

    wires.push({
      id: connection.id,
      ...wireBetween(fromRect, toRect),
      muted: connection.muted ?? false,
    });
  }
  return wires;
}

/** Bounding box of every wire, used to size the SVG layer. */
export function wireBounds(wires: readonly WirePath[]): Rect | null {
  if (wires.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const wire of wires) {
    for (const point of [wire.start, wire.end]) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
