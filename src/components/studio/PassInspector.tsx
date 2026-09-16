"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect } from "react";
import type { CapturePasses } from "@/lib/types";

type PassInspectorProps = {
  readonly passes: CapturePasses;
  readonly onClose: () => void;
};

const PASSES: readonly {
  key: keyof CapturePasses;
  label: string;
  role: string;
}[] = [
  {
    key: "beauty",
    label: "Beauty",
    role: "Starting image. Colour and shading the render departs from.",
  },
  {
    key: "depth",
    label: "Depth",
    role: "Linear distance from camera. Drives overall form and volume.",
  },
  {
    key: "normal",
    label: "Normal",
    role: "Surface direction. Drives how light reads across each face.",
  },
  {
    key: "edge",
    label: "Edges",
    role: "Real CAD edges. This is what stops the shape being redrawn.",
  },
  {
    key: "mask",
    label: "Silhouette",
    role: "Stays local. Reference outline for checking nothing moved.",
  },
];

/**
 * Shows the control maps the model is conditioned on.
 *
 * Worth surfacing rather than hiding: when a render does drift, these maps say
 * immediately whether the cause was a weak control signal (a bad camera angle,
 * a hidden feature) or the settings, instead of leaving the user to guess.
 */
export function PassInspector({ passes, onClose }: PassInspectorProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass w-full max-w-5xl rounded-2xl p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Control passes"
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[14px] font-semibold text-text">
              What the model is given
            </h2>
            <p className="mt-0.5 text-[11px] leading-snug text-dim">
              These come from your actual geometry, not guessed from a picture.
              Together they hold the product to its real shape and size.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-line px-2.5 py-1 text-[11px] text-dim transition-colors hover:text-text"
          >
            Close
          </button>
        </header>

        <div className="grid grid-cols-5 gap-3">
          {PASSES.map((pass) => (
            <figure key={pass.key}>
              <div className="overflow-hidden rounded-lg border border-line bg-black">
                <img
                  src={passes[pass.key]}
                  alt={`${pass.label} pass`}
                  className="aspect-square w-full object-contain"
                />
              </div>
              <figcaption className="mt-1.5">
                <span className="block text-[11px] font-medium text-text">
                  {pass.label}
                </span>
                <span className="mt-0.5 block text-[9.5px] leading-snug text-faint">
                  {pass.role}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
