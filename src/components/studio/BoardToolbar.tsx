"use client";

import { useRef, useState } from "react";
import { ComponentLibrary } from "./ComponentLibrary";
import type { ComponentSpec } from "@/lib/catalog";
import type { ModelUnit } from "@/lib/three/loadModel";
import { PANEL_ATTR } from "@/lib/board/wheelTarget";

type BoardToolbarProps = {
  readonly loadingModel: boolean;
  readonly loadingComponentId: string | null;
  readonly libraryOpen: boolean;
  readonly zoom: number;
  readonly canEdit: boolean;
  readonly onImport: (file: File, unit: ModelUnit) => void;
  readonly onAddComponent: (
    spec: ComponentSpec,
    params: Record<string, number>,
  ) => void;
  readonly onToggleLibrary: () => void;
  readonly onOpenEditor: () => void;
  readonly onZoom: (factor: number) => void;
};

const UNITS: readonly ModelUnit[] = ["mm", "cm", "m", "in"];

/**
 * The floating toolbar: everything that adds a card to the board, plus the
 * board's own zoom controls.
 */
export function BoardToolbar({
  loadingModel,
  loadingComponentId,
  libraryOpen,
  zoom,
  canEdit,
  onImport,
  onAddComponent,
  onToggleLibrary,
  onOpenEditor,
  onZoom,
}: BoardToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // STL carries no unit information, so this cannot be detected, only chosen.
  const [unit, setUnit] = useState<ModelUnit>("mm");

  return (
    <div className="pointer-events-none flex flex-col items-center gap-2">
      {libraryOpen ? (
        <div
          {...{ [PANEL_ATTR]: "true" }}
          className="glass pointer-events-auto max-h-[52vh] w-[330px] overflow-y-auto rounded-xl p-3"
        >
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="text-[13.5px] font-semibold tracking-[0.01em] text-dim">
              Electronics
            </h2>
            <span className="text-[12px] text-faint">
              real manufacturer CAD
            </span>
          </div>

          <ComponentLibrary
            onAdd={onAddComponent}
            loadingId={loadingComponentId}
          />
        </div>
      ) : null}

      <div
        {...{ [PANEL_ATTR]: "true" }}
        className="glass pointer-events-auto flex items-center gap-1 rounded-xl p-1.5"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".stl,.obj,.glb,.gltf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file, unit);
            // Reset so re-selecting the same file still fires a change event.
            event.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loadingModel}
          className="rounded-lg bg-accent px-3 py-2 text-[15px] font-semibold text-accent-ink transition-all hover:brightness-110 disabled:opacity-50"
        >
          {loadingModel ? "Reading..." : "Add 3D file"}
        </button>

        <div className="flex items-center gap-0.5 rounded-lg bg-raised p-0.5">
          {UNITS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setUnit(option)}
              title={`Treat imported files as ${option}`}
              className={`rounded-md px-1.5 py-1 text-[13px] font-medium transition-colors ${
                option === unit
                  ? "bg-accent text-accent-ink"
                  : "text-faint hover:text-text"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <Divider />

        <ToolButton active={libraryOpen} onClick={onToggleLibrary}>
          Electronics
        </ToolButton>

        <ToolButton onClick={onOpenEditor} disabled={!canEdit}>
          Position in 3D
        </ToolButton>

        <Divider />

        <ToolButton onClick={() => onZoom(1 / 1.2)}>-</ToolButton>
        <span className="min-w-[38px] text-center font-mono text-[13px] text-faint tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <ToolButton onClick={() => onZoom(1.2)}>+</ToolButton>
      </div>
    </div>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />;
}

function ToolButton({
  children,
  onClick,
  active = false,
  disabled = false,
}: {
  readonly children: React.ReactNode;
  readonly onClick: () => void;
  readonly active?: boolean;
  readonly disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-2.5 py-2 text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? "bg-[rgba(199,247,81,0.16)] text-accent"
          : "text-dim hover:bg-raised-hi hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
