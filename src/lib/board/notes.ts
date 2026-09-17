import type { Point } from "./boardState";

/**
 * Free-form notes pinned to the board.
 *
 * Deliberately outside the pipeline: a note explains the work to whoever opens
 * the board next, so it carries no wires and never affects a render. That
 * separation is the whole point — annotation should never change output.
 */

export type NoteFont = "sans" | "mono" | "serif";
export type NoteSize = "s" | "m" | "l" | "xl";
export type NoteColor = "default" | "accent" | "warn" | "muted";

export type Note = {
  readonly id: string;
  readonly text: string;
  readonly position: Point;
  readonly font: NoteFont;
  readonly size: NoteSize;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly color: NoteColor;
  readonly width: number;
};

export const NOTE_FONTS: readonly { id: NoteFont; label: string }[] = [
  { id: "sans", label: "Sans" },
  { id: "mono", label: "Mono" },
  { id: "serif", label: "Serif" },
];

export const NOTE_SIZES: readonly { id: NoteSize; label: string; px: number }[] = [
  { id: "s", label: "S", px: 14 },
  { id: "m", label: "M", px: 18 },
  { id: "l", label: "L", px: 24 },
  { id: "xl", label: "XL", px: 34 },
];

export const NOTE_COLORS: readonly { id: NoteColor; label: string; css: string }[] = [
  { id: "default", label: "Plain", css: "var(--text)" },
  { id: "accent", label: "Highlight", css: "var(--accent)" },
  { id: "warn", label: "Warning", css: "var(--danger)" },
  { id: "muted", label: "Quiet", css: "var(--dim)" },
];

const FONT_STACKS: Record<NoteFont, string> = {
  sans: "var(--font-geist-sans), system-ui, sans-serif",
  mono: "var(--font-geist-mono), ui-monospace, monospace",
  // Not loaded as a webfont; a system serif is enough for contrast and costs
  // nothing to download.
  serif: "Georgia, 'Times New Roman', serif",
};

export const DEFAULT_NOTE: Omit<Note, "id" | "position"> = {
  text: "",
  font: "sans",
  size: "m",
  bold: false,
  italic: false,
  color: "default",
  width: 300,
};

export function fontStack(font: NoteFont): string {
  return FONT_STACKS[font] ?? FONT_STACKS.sans;
}

export function sizePx(size: NoteSize): number {
  return NOTE_SIZES.find((entry) => entry.id === size)?.px ?? 18;
}

export function colorCss(color: NoteColor): string {
  return NOTE_COLORS.find((entry) => entry.id === color)?.css ?? "var(--text)";
}

/* ---------------------------------------------------------------------------
 * Immutable operations.
 * ------------------------------------------------------------------------ */

export function createNote(id: string, position: Point): Note {
  return { id, position, ...DEFAULT_NOTE };
}

export function updateNote(
  notes: readonly Note[],
  id: string,
  patch: Partial<Omit<Note, "id">>,
): readonly Note[] {
  return notes.map((note) => (note.id === id ? { ...note, ...patch } : note));
}

export function removeNote(
  notes: readonly Note[],
  id: string,
): readonly Note[] {
  return notes.filter((note) => note.id !== id);
}
