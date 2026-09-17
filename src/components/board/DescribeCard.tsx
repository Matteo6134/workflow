"use client";

import type { ReactNode } from "react";
import { Card } from "./Card";
import { CardIcon } from "./CardIcon";
import type { Point } from "@/lib/board/boardState";
import type { PromptSelection } from "@/lib/presets/composePrompt";

type DescribeCardProps = {
  readonly position: Point;
  readonly zoom: number;
  readonly selection: PromptSelection;
  readonly onChange: (selection: PromptSelection) => void;
  readonly composedPrompt: string;
  readonly onMove: (id: string, position: Point) => void;
  readonly onFocus: (id: string) => void;
  readonly onMeasure?: (
    id: string,
    size: { width: number; height: number },
  ) => void;
  readonly menu?: ReactNode;
  readonly deleteMenu?: ReactNode;
};

/**
 * Step one: what the thing actually is.
 *
 * Split out from the old combined panel because it asks a different question
 * from the style presets — this is the one field only you can answer, and it
 * was getting lost below a wall of swatches.
 */
export function DescribeCard({
  position,
  zoom,
  selection,
  onChange,
  composedPrompt,
  onMove,
  onFocus,
  onMeasure,
  menu,
  deleteMenu,
}: DescribeCardProps) {
  const patch = (next: Partial<PromptSelection>) =>
    onChange({ ...selection, ...next });

  return (
    <Card
      id="describe"
      position={position}
      zoom={zoom}
      title="Describe"
      icon={<CardIcon kind="describe" />}
      width={360}
      onMove={onMove}
      onFocus={onFocus}
      onMeasure={onMeasure}
      menu={menu}
      deleteMenu={deleteMenu}
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[13.5px] font-medium text-dim">
            What is it?
          </span>
          <textarea
            value={selection.subject}
            onChange={(event) => patch({ subject: event.target.value })}
            rows={3}
            placeholder="a compact desk lamp with a perforated aluminium base"
            className="w-full resize-none rounded-md border border-line bg-raised/80 px-2.5 py-2 text-[15px] leading-snug text-text outline-none placeholder:text-faint focus:border-accent"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13.5px] font-medium text-dim">
            Anything else
          </span>
          <input
            type="text"
            value={selection.extra}
            onChange={(event) => patch({ extra: event.target.value })}
            placeholder="with a bright orange cable"
            className="w-full rounded-md border border-line bg-raised/80 px-2.5 py-2 text-[15px] text-text outline-none placeholder:text-faint focus:border-accent"
          />
        </label>

        <details className="rounded-md border border-line bg-raised/40">
          <summary className="cursor-pointer px-2.5 py-2 text-[13.5px] text-dim transition-colors hover:text-text">
            Show the prompt this builds
          </summary>
          <p className="max-h-32 overflow-y-auto border-t border-line px-2.5 py-2 font-mono text-[13px] leading-relaxed text-faint">
            {composedPrompt || "Describe the object to build a prompt."}
          </p>
        </details>
      </div>
    </Card>
  );
}
