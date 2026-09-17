import { describe, expect, it } from "vitest";
import {
  NOTE_COLORS,
  NOTE_FONTS,
  NOTE_SIZES,
  colorCss,
  createNote,
  fontStack,
  removeNote,
  sizePx,
  updateNote,
} from "./notes";

const at = (x: number, y: number) => ({ x, y });

describe("createNote", () => {
  it("starts empty at the given position", () => {
    const note = createNote("n1", at(10, 20));
    expect(note.text).toBe("");
    expect(note.position).toEqual({ x: 10, y: 20 });
  });

  it("uses readable defaults", () => {
    const note = createNote("n1", at(0, 0));
    expect(note.font).toBe("sans");
    expect(note.size).toBe("m");
    expect(note.bold).toBe(false);
    expect(note.color).toBe("default");
  });
});

describe("updateNote", () => {
  const notes = [createNote("a", at(0, 0)), createNote("b", at(10, 10))];

  it("changes only the targeted note", () => {
    const next = updateNote(notes, "a", { text: "hello", bold: true });
    expect(next[0].text).toBe("hello");
    expect(next[0].bold).toBe(true);
    expect(next[1].text).toBe("");
  });

  it("does not mutate the input", () => {
    updateNote(notes, "a", { text: "changed" });
    expect(notes[0].text).toBe("");
  });

  it("ignores an unknown id", () => {
    expect(updateNote(notes, "nope", { text: "x" })).toHaveLength(2);
  });
});

describe("removeNote", () => {
  it("drops just that note", () => {
    const notes = [createNote("a", at(0, 0)), createNote("b", at(0, 0))];
    const next = removeNote(notes, "a");
    expect(next.map((n) => n.id)).toEqual(["b"]);
    expect(notes).toHaveLength(2);
  });
});

describe("style resolution", () => {
  it("resolves every offered font to a stack", () => {
    for (const font of NOTE_FONTS) {
      expect(fontStack(font.id).length).toBeGreaterThan(0);
    }
  });

  it("resolves every offered size to pixels, ascending", () => {
    const pixels = NOTE_SIZES.map((s) => sizePx(s.id));
    expect(pixels).toEqual([...pixels].sort((a, b) => a - b));
    expect(new Set(pixels).size).toBe(pixels.length);
  });

  it("resolves every offered colour", () => {
    for (const colour of NOTE_COLORS) {
      expect(colorCss(colour.id)).toContain("var(--");
    }
  });

  /** A note saved with a value from a future build must not render invisibly. */
  it("falls back rather than returning nothing for unknown values", () => {
    // @ts-expect-error - deliberately invalid
    expect(fontStack("nope")).toContain("sans-serif");
    // @ts-expect-error - deliberately invalid
    expect(sizePx("nope")).toBe(18);
    // @ts-expect-error - deliberately invalid
    expect(colorCss("nope")).toBe("var(--text)");
  });
});
