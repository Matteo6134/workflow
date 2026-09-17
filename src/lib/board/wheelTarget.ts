/**
 * Decides what a wheel event over the board should do.
 *
 * The board fills the window and cards sit on top of it, so without this every
 * wheel tick over a panel — picking a material, scrolling the electronics list
 * — zoomed the board instead of scrolling the panel under the cursor.
 *
 * Zoom is reserved for the bare board. Anything under the cursor that belongs
 * to the UI - a card, a panel, a scroller - keeps the wheel, so resting on a
 * card and scrolling never yanks the whole board's scale.
 *
 * Ctrl/pinch still zooms anywhere, which is the platform gesture for it.
 */

/**
 * Floating UI that always captures the wheel: toolbar, popovers, menus.
 * Distinct from a card, because these sit above the board rather than on it.
 */
export const PANEL_ATTR = "data-board-panel";

/**
 * A card on the board. Cards capture the wheel outright, whether or not they
 * have anything to scroll: zooming the whole board while the cursor rests on a
 * card is disorienting, and a card is where the user's attention already is.
 */
export const CARD_ATTR = "data-board-card";

export type WheelIntent = "zoom" | "scroll";

/** One ancestor between the event target and the board. */
export type WheelPathNode = {
  /** Marked with CARD_ATTR: a board card, which keeps the wheel. */
  readonly isCard: boolean;
  /** Marked with PANEL_ATTR: always swallows the wheel. */
  readonly isPanel: boolean;
  /**
   * Is a scroll container, so the wheel belongs to it.
   *
   * Deliberately NOT direction-aware. Allowing the board to zoom once a panel
   * hits its top or bottom means resting the cursor on a preset list and
   * scrolling up suddenly zooms the whole board - the exact complaint this
   * exists to fix. A scroller captures the wheel whether or not it can still
   * move, like `overscroll-behavior: contain`.
   */
  readonly capturesWheel: boolean;
};

export type WheelContext = {
  readonly ctrlKey: boolean;
  readonly deltaY: number;
  /** Ancestors from the event target outwards, stopping at the board. */
  readonly path: readonly WheelPathNode[];
};

/**
 * Resolves a wheel event to a single intent.
 *
 * `ctrlKey` is how browsers report a trackpad pinch, so that always zooms —
 * otherwise pinching over a card would be silently swallowed.
 */
export function wheelIntent(context: WheelContext): WheelIntent {
  if (context.ctrlKey) return "zoom";

  // A horizontal swipe reports deltaY === 0. Treating that as a direction
  // would zoom out on every sideways trackpad gesture.
  if (context.deltaY === 0) return "scroll";

  for (const node of context.path) {
    if (node.isCard || node.isPanel || node.capturesWheel) return "scroll";
  }
  return "zoom";
}

/* -------------------------------------------------------------------------
 * Wheel step
 * ---------------------------------------------------------------------- */

/** deltaMode values, which browsers report in different units. */
const DELTA_MODE_LINE = 1;
const DELTA_MODE_PAGE = 2;
const LINE_HEIGHT_PX = 16;
const PAGE_HEIGHT_PX = 800;

/** Converts a wheel delta to pixels regardless of how the browser reports it. */
export function deltaToPixels(deltaY: number, deltaMode: number): number {
  if (deltaMode === DELTA_MODE_LINE) return deltaY * LINE_HEIGHT_PX;
  if (deltaMode === DELTA_MODE_PAGE) return deltaY * PAGE_HEIGHT_PX;
  return deltaY;
}

/** How fast zoom responds to scroll distance. */
const ZOOM_SENSITIVITY = 0.0015;
/** Caps a single event, so one coarse mouse notch cannot jump the whole range. */
const MAX_STEP = 1.25;

/**
 * Zoom factor for one wheel event.
 *
 * Exponential in the pixel delta, which makes it scale-free (the same gesture
 * changes zoom by the same ratio at any level) and exactly reversible. A fixed
 * step per event instead made trackpads — which emit dozens of small events per
 * gesture — rocket between the zoom limits.
 */
export function zoomFactorFor(deltaY: number, deltaMode = 0): number {
  const pixels = deltaToPixels(deltaY, deltaMode);
  const factor = Math.exp(-pixels * ZOOM_SENSITIVITY);
  return Math.min(MAX_STEP, Math.max(1 / MAX_STEP, factor));
}

/* -------------------------------------------------------------------------
 * DOM adapter
 * ---------------------------------------------------------------------- */

/**
 * True when `element` is a vertical scroll container.
 *
 * Whether it can currently move is intentionally not considered - see
 * {@link WheelPathNode.capturesWheel}.
 */
function isScrollContainer(element: Element): boolean {
  // A textarea scrolls itself without an explicit overflow style.
  if (element.tagName === "TEXTAREA") return true;

  const overflowY = window.getComputedStyle(element).overflowY;
  return overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
}

/**
 * Walks from the event target up to (but excluding) the board, describing each
 * ancestor. Kept separate from {@link wheelIntent} so the decision stays pure
 * and testable without a DOM.
 */
export function collectWheelPath(
  target: Element | null,
  boundary: Element | null,
): WheelPathNode[] {
  const path: WheelPathNode[] = [];
  let current: Element | null = target;

  while (current && current !== boundary) {
    path.push({
      isCard: current.hasAttribute(CARD_ATTR),
      isPanel: current.hasAttribute(PANEL_ATTR),
      capturesWheel: isScrollContainer(current),
    });
    current = current.parentElement;
  }
  return path;
}
