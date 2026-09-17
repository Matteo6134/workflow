"use client";

import { useEffect, useRef, useState } from "react";
import { PANEL_ATTR } from "@/lib/board/wheelTarget";

export type CardAction = {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly onSelect: () => void;
  readonly disabled?: boolean;
  readonly danger?: boolean;
  /** Renders as a highlighted chip in a row, for compact sets like views. */
  readonly compact?: boolean;
};

export type CardActionGroup = {
  readonly label: string;
  readonly actions: readonly CardAction[];
};

type CardMenuProps = {
  readonly groups: readonly CardActionGroup[];
  readonly title?: string;
};

/**
 * The "+" on a card header: everything that card can trigger.
 *
 * Grouped rather than a flat list, because the useful actions split into
 * "change what is rendered" and "change how it is rendered", and a single
 * column of a dozen verbs hides that distinction.
 */
export function CardMenu({ groups, title = "Actions" }: CardMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-expanded={open}
        // The header is a drag handle; keep a menu click from starting a drag.
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
          open
            ? "bg-accent text-accent-ink"
            : "bg-raised-hi text-dim hover:bg-accent hover:text-accent-ink"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M8 3.5v9M3.5 8h9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          {...{ [PANEL_ATTR]: "true" }}
          // Capped so a long action list scrolls inside the popover rather
          // than overflowing the card.
          className="glass absolute right-0 top-9 z-30 max-h-[320px] w-[250px] overflow-y-auto rounded-lg p-1.5"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {groups.map((group, groupIndex) => (
            <div
              key={group.label}
              className={groupIndex > 0 ? "mt-1.5 border-t border-line pt-1.5" : ""}
            >
              <p className="px-1.5 pb-1 text-[12px] font-semibold tracking-[0.01em] text-faint">
                {group.label}
              </p>

              {group.actions.some((action) => action.compact) ? (
                <div className="flex flex-wrap gap-1 px-1 pb-0.5">
                  {group.actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      disabled={action.disabled}
                      title={action.hint}
                      onClick={() => {
                        action.onSelect();
                        setOpen(false);
                      }}
                      className="rounded-md bg-raised px-2 py-1 text-[13.5px] text-dim transition-colors hover:bg-accent hover:text-accent-ink disabled:opacity-40"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : (
                group.actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    disabled={action.disabled}
                    title={action.hint}
                    onClick={() => {
                      action.onSelect();
                      setOpen(false);
                    }}
                    className={`block w-full rounded-md px-1.5 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      action.danger
                        ? "text-danger hover:bg-danger/10"
                        : "text-text hover:bg-raised-hi"
                    }`}
                  >
                    <span className="block text-[15px] leading-tight">
                      {action.label}
                    </span>
                    {action.hint ? (
                      <span className="mt-0.5 block text-[12px] leading-tight text-faint">
                        {action.hint}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
