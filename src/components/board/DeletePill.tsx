"use client";

export type DeleteAction = {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly disabled?: boolean;
  readonly onSelect: () => void;
};

type DeletePillProps = {
  /** Destructive choices, revealed as words when the pill is hovered. */
  readonly actions: readonly DeleteAction[];
};

/**
 * The delete control on a card's title row.
 *
 * Collapsed it is a red cross. Hovering fills the pill red and swaps the cross
 * for the words that actually delete, so a destructive action always takes a
 * second, deliberate move.
 */
export function DeletePill({ actions }: DeletePillProps) {
  if (actions.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-1" data-delete-pill>

      {actions.length > 0 ? (
        <div className="group/del">
          <div className="flex items-center rounded-full border border-danger/50 transition-colors duration-150 group-hover/del:border-danger group-hover/del:bg-danger">
            {/* max-width animates; width:auto does not. */}
            <div className="max-w-0 overflow-hidden transition-[max-width] duration-200 ease-out group-hover/del:max-w-[320px]">
              <div className="flex items-center gap-1 whitespace-nowrap px-1">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    title={action.hint}
                    disabled={action.disabled}
                    onClick={action.onSelect}
                    className="rounded-full px-2.5 py-1 text-[13px] font-medium text-white transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* The cross collapses away once the pill is open: with the words
                showing, a lingering cross is a second target for one action. */}
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-danger transition-all duration-200 group-hover/del:w-0 group-hover/del:opacity-0"
              aria-hidden
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="m4.5 4.5 7 7M11.5 4.5l-7 7"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

