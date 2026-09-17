"use client";

/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";

import { Card } from "./Card";
import { CardIcon } from "./CardIcon";
import type { Point } from "@/lib/board/boardState";
import type { RenderedImage } from "@/lib/types";

type RenderCardProps = {
  readonly position: Point;
  readonly zoom: number;
  readonly results: readonly RenderedImage[];
  readonly rendering: boolean;
  readonly pendingCount: number;
  readonly onOpen: (image: RenderedImage) => void;
  readonly onMove: (id: string, position: Point) => void;
  readonly onFocus: (id: string) => void;
  readonly menu?: ReactNode;
  readonly onMeasure?: (
    id: string,
    size: { width: number; height: number },
  ) => void;
};

/**
 * Generated images, newest first.
 *
 * Earlier attempts stay on the card rather than being replaced: choosing the
 * best of several variations is most of the work in product imagery.
 */
export function RenderCard({
  position,
  zoom,
  results,
  rendering,
  pendingCount,
  onOpen,
  onMove,
  onFocus,
  menu,
  onMeasure,
}: RenderCardProps) {
  return (
    <Card
      id="renders"
      position={position}
      zoom={zoom}
      title="Renders"
      icon={<CardIcon kind="renders" />}
      badge={results.length ? `${results.length}` : undefined}
      width={380}
      onMove={onMove}
      onFocus={onFocus}
      menu={menu}
      onMeasure={onMeasure}
    >
      {results.length === 0 && !rendering ? (
        <p className="py-6 text-center text-[14px] leading-relaxed text-faint">
          Nothing rendered yet.
          <br />
          Stage your model, describe it, then hit Render.
        </p>
      ) : (
        <div className="grid max-h-[460px] grid-cols-2 gap-2 overflow-y-auto pr-1">
          {rendering
            ? Array.from({ length: pendingCount }).map((_, index) => (
                <div
                  key={`pending-${index}`}
                  className="shimmer aspect-square rounded-lg"
                />
              ))
            : null}

          {results.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => onOpen(image)}
              className="group relative overflow-hidden rounded-lg border border-line transition-colors hover:border-accent"
            >
              <img
                src={image.url}
                alt={`Render ${index + 1}`}
                className="aspect-square w-full object-cover"
                draggable={false}
              />
              <span className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/60 text-[13px] font-medium text-white group-hover:flex">
                Open
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
