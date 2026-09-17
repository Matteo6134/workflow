"use client";

import type { ReactNode } from "react";

type RailSectionProps = {
  readonly title: string;
  /** Step number, so the rails read as an ordered pipeline. */
  readonly step?: number;
  readonly hint?: string;
  readonly children: ReactNode;
};

export function RailSection({ title, step, hint, children }: RailSectionProps) {
  return (
    <section className="border-b border-line px-3.5 py-3.5 last:border-b-0">
      <header className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[13.5px] font-semibold tracking-[0.01em] text-dim">
          {step !== undefined ? (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-raised-hi font-mono text-[12px] text-text">
              {step}
            </span>
          ) : null}
          {title}
        </h2>
        {hint ? (
          <span className="max-w-[140px] truncate text-[12px] text-faint" title={hint}>
            {hint}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  );
}
