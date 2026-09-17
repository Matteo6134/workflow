"use client";

import { useCallback, useRef, useState } from "react";
import { PANEL_ATTR } from "@/lib/board/wheelTarget";
import {
  NOTE_COLORS,
  NOTE_FONTS,
  NOTE_SIZES,
  colorCss,
  fontStack,
  sizePx,
  type Note,
} from "@/lib/board/notes";
import type { Point } from "@/lib/board/boardState";

type NoteCardProps = {
  readonly note: Note;
  readonly zoom: number;
  readonly onChange: (id: string, patch: Partial<Note>) => void;
  readonly onRemove: (id: string) => void;
  readonly onFocus: (id: string) => void;
};

/**
 * A note pinned to the board, for explaining the work to whoever opens it next.
 *
 * Styled as paper rather than as another glass panel: a note is a human aside,
 * not part of the machinery, and making it look like the pipeline cards would
 * suggest it feeds them. It carries no wires for the same reason.
 *
 * Formatting appears only while the note is selected, so a board full of notes
 * stays quiet.
 */
export function NoteCard({
  note,
  zoom,
  onChange,
  onRemove,
  onFocus,
}: NoteCardProps) {
  const [editing, setEditing] = useState(note.text === "");
  const [selected, setSelected] = useState(note.text === "");
  const dragging = useRef(false);
  const last = useRef<Point>({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.stopPropagation();
      dragging.current = true;
      last.current = { x: event.clientX, y: event.clientY };
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      onFocus(note.id);
      setSelected(true);
    },
    [note.id, onFocus],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragging.current) return;
      const dx = (event.clientX - last.current.x) / zoom;
      const dy = (event.clientY - last.current.y) / zoom;
      last.current = { x: event.clientX, y: event.clientY };
      onChange(note.id, {
        position: { x: note.position.x + dx, y: note.position.y + dy },
      });
    },
    [note.id, note.position.x, note.position.y, onChange, zoom],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    dragging.current = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }, []);

  const textStyle = {
    fontFamily: fontStack(note.font),
    fontSize: sizePx(note.size),
    fontWeight: note.bold ? 700 : 400,
    fontStyle: note.italic ? "italic" : "normal",
    color: colorCss(note.color),
    lineHeight: 1.35,
  } as const;

  return (
    <div
      {...{ [PANEL_ATTR]: "true" }}
      className="group absolute"
      style={{ left: note.position.x, top: note.position.y, width: note.width }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        className={`rounded-lg border bg-[rgba(24,26,31,0.82)] backdrop-blur-xl transition-colors ${
          selected ? "border-accent/70" : "border-line hover:border-line-strong"
        }`}
      >
        {/* Drag strip. Dragging from the text would fight with selecting it. */}
        <div
          className="flex cursor-grab items-center gap-1 rounded-t-lg px-2 py-1 active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span className="flex-1 text-[11px] text-faint">Note</span>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onRemove(note.id)}
            title="Delete note"
            aria-label="Delete note"
            className="text-faint opacity-0 transition-all hover:text-danger group-hover:opacity-100"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="m4 4 8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {editing ? (
          <textarea
            autoFocus
            value={note.text}
            onChange={(event) => onChange(note.id, { text: event.target.value })}
            onBlur={() => setEditing(false)}
            placeholder="Explain what happens here..."
            rows={3}
            className="w-full resize-none bg-transparent px-3 pb-3 outline-none placeholder:text-faint"
            style={textStyle}
          />
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelected(true);
              setEditing(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") setEditing(true);
            }}
            className="min-h-[2.5rem] cursor-text whitespace-pre-wrap break-words px-3 pb-3"
            style={textStyle}
          >
            {note.text || (
              <span className="text-faint" style={{ fontSize: 14 }}>
                Click to write a note
              </span>
            )}
          </div>
        )}
      </div>

      {selected ? (
        <div className="glass backdrop-blur-2xl backdrop-saturate-150 absolute left-0 top-full z-20 mt-2 flex flex-wrap items-center gap-1 rounded-lg p-1.5">
          <Group>
            {NOTE_FONTS.map((font) => (
              <Chip
                key={font.id}
                active={note.font === font.id}
                onClick={() => onChange(note.id, { font: font.id })}
                style={{ fontFamily: fontStack(font.id) }}
              >
                {font.label}
              </Chip>
            ))}
          </Group>

          <Divider />

          <Group>
            {NOTE_SIZES.map((size) => (
              <Chip
                key={size.id}
                active={note.size === size.id}
                onClick={() => onChange(note.id, { size: size.id })}
              >
                {size.label}
              </Chip>
            ))}
          </Group>

          <Divider />

          <Group>
            <Chip
              active={note.bold}
              onClick={() => onChange(note.id, { bold: !note.bold })}
              style={{ fontWeight: 700 }}
            >
              B
            </Chip>
            <Chip
              active={note.italic}
              onClick={() => onChange(note.id, { italic: !note.italic })}
              style={{ fontStyle: "italic" }}
            >
              I
            </Chip>
          </Group>

          <Divider />

          <Group>
            {NOTE_COLORS.map((colour) => (
              <button
                key={colour.id}
                type="button"
                title={colour.label}
                aria-label={colour.label}
                onClick={() => onChange(note.id, { color: colour.id })}
                className={`h-6 w-6 rounded-md border transition-transform ${
                  note.color === colour.id
                    ? "border-accent scale-110"
                    : "border-line hover:scale-105"
                }`}
                style={{ background: colour.css }}
              />
            ))}
          </Group>

          <Divider />

          <button
            type="button"
            onClick={() => setSelected(false)}
            className="rounded-md px-2 py-1 text-[12px] text-dim transition-colors hover:text-text"
          >
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Group({ children }: { readonly children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />;
}

function Chip({
  children,
  active,
  onClick,
  style,
}: {
  readonly children: React.ReactNode;
  readonly active: boolean;
  readonly onClick: () => void;
  readonly style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`min-w-[28px] rounded-md px-2 py-1 text-[13px] transition-colors ${
        active
          ? "bg-accent text-accent-ink"
          : "bg-raised text-dim hover:bg-raised-hi hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
