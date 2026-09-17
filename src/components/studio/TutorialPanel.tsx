"use client";

export type TutorialStep = {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly done: boolean;
  /** CSS selector the assistant should point at for this step. */
  readonly target?: string;
};

type TutorialPanelProps = {
  readonly steps: readonly TutorialStep[];
  readonly onDismiss: () => void;
};

/**
 * What this tool does, and where you are in it.
 *
 * Deliberately NOT a card on the board: it belongs to the application, not to
 * the pipeline, so it stays fixed while the board pans and zooms underneath.
 * Putting it on the board meant it scaled with the work and sat in front of
 * cards you were trying to click.
 *
 * A live checklist rather than a scripted tour — each step ticks itself off
 * from real state, so it doubles as progress and can never disagree with what
 * you have actually done.
 */
export function TutorialPanel({ steps, onDismiss }: TutorialPanelProps) {
  const completed = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);

  return (
    <aside className="glass backdrop-blur-2xl backdrop-saturate-150 pointer-events-auto w-[380px] rounded-xl p-4">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-text">Start here</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-dim">
            Turn a 3D file into product photography. Your part keeps its exact
            shape and millimetre size — the render only invents the material,
            the light and the room.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          title="Hide"
          aria-label="Hide the guide"
          className="shrink-0 text-faint transition-colors hover:text-text"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="m4 4 8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <ol className="space-y-1">
        {steps.map((step) => {
          const isNext = step.id === next?.id;
          return (
            <li
              key={step.id}
              className={`flex gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                isNext ? "bg-[rgba(199,247,81,0.08)]" : ""
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold ${
                  step.done
                    ? "border-accent bg-accent text-accent-ink"
                    : isNext
                      ? "border-accent text-accent"
                      : "border-line text-faint"
                }`}
                aria-hidden
              >
                {step.done ? <Tick /> : null}
              </span>

              <span className="min-w-0">
                <span
                  className={`block text-[14.5px] font-medium ${
                    step.done ? "text-dim line-through" : "text-text"
                  }`}
                >
                  {step.title}
                </span>
                <span className="block text-[13px] leading-snug text-faint">
                  {step.detail}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="font-mono text-[12px] text-faint tabular-nums">
          {completed}/{steps.length} done
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[13px] text-dim underline transition-colors hover:text-text"
        >
          Hide this
        </button>
      </div>
    </aside>
  );
}

function Tick() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
