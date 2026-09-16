import { describe, expect, it } from "vitest";
import {
  CARD_HEIGHT,
  INITIAL_BOARD,
  MAX_ZOOM,
  MIN_ZOOM,
  addCard,
  clampZoom,
  moveCard,
  nextFreePosition,
  raiseCard,
  removeCardsFor,
  screenToBoard,
  zoomAt,
  type BoardCard,
} from "./boardState";

const card = (id: string, x: number, y: number, sceneItemId?: string): BoardCard => ({
  id,
  kind: "object",
  position: { x, y },
  ...(sceneItemId ? { sceneItemId } : {}),
});

describe("nextFreePosition", () => {
  it("stacks the first card at the top of the column", () => {
    expect(nextFreePosition([]).y).toBe(80);
  });

  it("never returns a slot that overlaps an existing card", () => {
    const first = nextFreePosition([]);
    const second = nextFreePosition([card("a", first.x, first.y)]);
    expect(Math.abs(second.y - first.y)).toBeGreaterThanOrEqual(CARD_HEIGHT);
  });

  it("ignores cards sitting in a different column", () => {
    const other = nextFreePosition([], 2);
    expect(nextFreePosition([card("a", other.x, other.y)]).y).toBe(80);
  });
});

describe("zoom", () => {
  it("clamps to the supported range", () => {
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(0.001)).toBe(MIN_ZOOM);
  });

  it("keeps the point under the cursor fixed", () => {
    const cursor = { x: 400, y: 300 };
    const before = screenToBoard(cursor, INITIAL_BOARD.viewport);
    const zoomed = zoomAt(INITIAL_BOARD, 1.5, cursor);
    const after = screenToBoard(cursor, zoomed.viewport);

    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it("does not move the board when already at the limit", () => {
    const maxed = { ...INITIAL_BOARD, viewport: { pan: { x: 5, y: 5 }, zoom: MAX_ZOOM } };
    expect(zoomAt(maxed, 2, { x: 100, y: 100 })).toBe(maxed);
  });
});

describe("card operations are immutable", () => {
  it("addCard does not mutate the input", () => {
    const before = INITIAL_BOARD.cards.length;
    const next = addCard(INITIAL_BOARD, card("x", 0, 0));
    expect(INITIAL_BOARD.cards.length).toBe(before);
    expect(next.cards.length).toBe(before + 1);
  });

  it("moveCard leaves other cards untouched", () => {
    const state = addCard(INITIAL_BOARD, card("x", 10, 10));
    const moved = moveCard(state, "x", { x: 99, y: 99 });
    expect(moved.cards.find((c) => c.id === "x")?.position).toEqual({ x: 99, y: 99 });
    expect(state.cards.find((c) => c.id === "x")?.position).toEqual({ x: 10, y: 10 });
  });

  it("removeCardsFor drops every card bound to that scene item", () => {
    const state = addCard(
      addCard(INITIAL_BOARD, card("a", 0, 0, "item-1")),
      card("b", 0, 400, "item-1"),
    );
    expect(removeCardsFor(state, "item-1").cards.some((c) => c.sceneItemId === "item-1")).toBe(
      false,
    );
  });

  it("raiseCard moves the card to the end of the paint order", () => {
    const state = addCard(INITIAL_BOARD, card("x", 0, 0));
    const raised = raiseCard(state, "look");
    expect(raised.cards.at(-1)?.id).toBe("look");
    expect(raised.cards.length).toBe(state.cards.length);
  });

  it("raiseCard is a no-op for an unknown id", () => {
    expect(raiseCard(INITIAL_BOARD, "nope")).toBe(INITIAL_BOARD);
  });
});
