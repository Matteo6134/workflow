"use client";

export type DeleteAction = {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly disabled?: boolean;
  readonly onSelect: () => void;
};

export type IconAction = {
  readonly id: string;
  readonly hint: string;
  readonly active?: boolean;
  readonly onSelect: () => void;
};

type DeletePillProps = {
  /** Destructive choices, revealed as words when the pill is hovered. */
  readonly actions: readonly DeleteAction[];
  /** A non-destructive toggle that stays visible as an icon. */
  readonly hide?: IconAction;
};

/**
 * The delete control on a card's title row.
 *
 * Collapsed it is an eye (hide) and a red cross. Hovering the cross fills the
 * pill red and swaps the cross for the words that actually delete, so a
 * destructive action always takes a second, deliberate move.
 *
 * The eye sits OUTSIDE the hover group on purpose: reaching for hide should not
 * make the delete options bloom under the cursor.
 */
export function DeletePill({ actions, hide }: DeletePillProps) {
  if (actions.length === 0 && !hide) return null;

  return (
    <div className="flex shrink-0 items-center gap-1" data-delete-pill>
      {hide ? (
        <button
          type="button"
          title={hide.hint}
          aria-label={hide.hint}
          aria-pressed={hide.active === false}
          onClick={hide.onSelect}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            hide.active === false
              ? "text-faint hover:text-text"
              : "text-dim hover:text-text"
          }`}
        >
          <EyeIcon open={hide.active !== false} />
        </button>
      ) : null}

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

function EyeIcon({ open }: { readonly open: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden>
      {open ? (
        <>
          <path
            d="M1.5 8S3.8 3.5 8 3.5 14.5 8 14.5 8 12.2 12.5 8 12.5 1.5 8 1.5 8Z"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
        </>
      ) : (
        <>
          <path
            d="M2 8s2.3-4.5 6-4.5c1 0 1.9.3 2.7.7M14 8s-2.3 4.5-6 4.5c-1 0-1.9-.3-2.6-.7"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="m2.5 2.5 11 11"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
