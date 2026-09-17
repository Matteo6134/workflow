/**
 * The board: a pan/zoom surface holding cards.
 *
 * Card positions are plain data in board coordinates, independent of screen
 * pixels, so pan and zoom never have to touch them.
 */

export type CardKind = "object" | "look" | "render";

export type Point = { readonly x: number; readonly y: number };

export type BoardCard = {
  readonly id: string;
  readonly kind: CardKind;
  readonly position: Point;
  /** For "object" cards: the scene item this card represents. */
  readonly sceneItemId?: string;
};

export type BoardViewport = {
  readonly pan: Point;
  readonly zoom: number;
};

export type BoardState = {
  readonly cards: readonly BoardCard[];
  readonly viewport: BoardViewport;
};

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2.5;

/** Card footprint in board units, used for auto-placement. */
export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 360;
const GAP = 36;

export const INITIAL_BOARD: BoardState = {
  cards: [{ id: "look", kind: "look", position: { x: 640, y: 80 } }],
  viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
};

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/**
 * Finds a free slot in a column-major grid so new cards never land on top of
 * an existing one.
 */
export function nextFreePosition(
  cards: readonly BoardCard[],
  column = 0,
): Point {
  const columnX = 80 + column * (CARD_WIDTH + GAP);
  const occupied = cards
    .filter((card) => Math.abs(card.position.x - columnX) < 1)
    .map((card) => card.position.y);

  let y = 80;
  while (occupied.some((taken) => Math.abs(taken - y) < CARD_HEIGHT)) {
    y += CARD_HEIGHT + GAP;
  }
  return { x: columnX, y };
}

export function addCard(state: BoardState, card: BoardCard): BoardState {
  return { ...state, cards: [...state.cards, card] };
}

export function removeCardsFor(
  state: BoardState,
  sceneItemId: string,
): BoardState {
  return {
    ...state,
    cards: state.cards.filter((card) => card.sceneItemId !== sceneItemId),
  };
}

export function moveCard(
  state: BoardState,
  id: string,
  position: Point,
): BoardState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === id ? { ...card, position } : card,
    ),
  };
}

/** Brings a card to the front by moving it to the end of the paint order. */
export function raiseCard(state: BoardState, id: string): BoardState {
  const card = state.cards.find((item) => item.id === id);
  if (!card) return state;
  return {
    ...state,
    cards: [...state.cards.filter((item) => item.id !== id), card],
  };
}

export function panBy(state: BoardState, delta: Point): BoardState {
  return {
    ...state,
    viewport: {
      ...state.viewport,
      pan: {
        x: state.viewport.pan.x + delta.x,
        y: state.viewport.pan.y + delta.y,
      },
    },
  };
}

/**
 * Zooms around a fixed screen point, so the board appears to scale under the
 * cursor rather than drifting toward the origin.
 *
 * This is the single implementation; the board UI calls it directly rather
 * than repeating the arithmetic, so the two can never disagree.
 */
export function zoomViewport(
  viewport: BoardViewport,
  factor: number,
  screenPoint: Point,
): BoardViewport {
  const { pan, zoom } = viewport;
  const next = clampZoom(zoom * factor);
  if (next === zoom) return viewport;

  // Keep the board point under the cursor fixed across the zoom.
  const boardX = (screenPoint.x - pan.x) / zoom;
  const boardY = (screenPoint.y - pan.y) / zoom;

  return {
    zoom: next,
    pan: {
      x: screenPoint.x - boardX * next,
      y: screenPoint.y - boardY * next,
    },
  };
}

export function zoomAt(
  state: BoardState,
  factor: number,
  screenPoint: Point,
): BoardState {
  const viewport = zoomViewport(state.viewport, factor, screenPoint);
  return viewport === state.viewport ? state : { ...state, viewport };
}

export function screenToBoard(
  point: Point,
  viewport: BoardViewport,
): Point {
  return {
    x: (point.x - viewport.pan.x) / viewport.zoom,
    y: (point.y - viewport.pan.y) / viewport.zoom,
  };
}
