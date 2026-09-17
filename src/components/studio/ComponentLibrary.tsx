"use client";

import { useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  componentsByCategory,
  defaultParams,
  isLibraryComponent,
  type ComponentCategory,
  type ComponentParam,
  type ComponentSpec,
} from "@/lib/catalog";

type ComponentLibraryProps = {
  readonly onAdd: (spec: ComponentSpec, params: Record<string, number>) => void;
  /** Id of the part currently being fetched and parsed, if any. */
  readonly loadingId: string | null;
};

/**
 * Browser for the built-in electronics catalogue.
 *
 * Parts are generated at true datasheet dimensions, so what lands on the stage
 * can be trusted for a fit-check - the dimensions shown here are the ones the
 * real part has.
 */
export function ComponentLibrary({ onAdd, loadingId }: ComponentLibraryProps) {
  const grouped = useMemo(() => componentsByCategory(), []);
  const categories = useMemo(() => [...grouped.keys()], [grouped]);
  const [active, setActive] = useState<ComponentCategory>(categories[0]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const parts = grouped.get(active) ?? [];

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap gap-1">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActive(category)}
            className={`rounded-full px-2.5 py-1 text-[13.5px] font-medium transition-colors ${
              category === active
                ? "bg-accent text-accent-ink"
                : "bg-raised text-dim hover:bg-raised-hi hover:text-text"
            }`}
          >
            {CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      <ul className="space-y-1">
        {parts.map((spec) => (
          <PartRow
            key={spec.id}
            spec={spec}
            expanded={expandedId === spec.id}
            onToggle={() =>
              setExpandedId((current) => (current === spec.id ? null : spec.id))
            }
            onAdd={onAdd}
            loading={loadingId === spec.id}
          />
        ))}
      </ul>
    </div>
  );
}

type PartRowProps = {
  readonly spec: ComponentSpec;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly onAdd: (spec: ComponentSpec, params: Record<string, number>) => void;
  readonly loading: boolean;
};

function PartRow({ spec, expanded, onToggle, onAdd, loading }: PartRowProps) {
  const [params, setParams] = useState<Record<string, number>>(() =>
    defaultParams(spec),
  );
  const specParams: readonly ComponentParam[] = isLibraryComponent(spec)
    ? []
    : (spec.params ?? []);
  const hasParams = specParams.length > 0;
  const isReal = isLibraryComponent(spec);

  return (
    <li className="rounded-md border border-line bg-raised/60">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button
          type="button"
          onClick={hasParams ? onToggle : () => onAdd(spec, params)}
          className="min-w-0 flex-1 text-left"
          title={spec.summary}
        >
          <span className="block truncate text-[15px] font-medium text-text">
            {spec.name}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[12px] text-faint">
            {spec.size.x} x {spec.size.y} x {spec.size.z} mm
            {/* Real manufacturer CAD vs a dimensionally-accurate stand-in -
                the user should always know which one they placed. */}
            <span
              className={isReal ? "text-accent" : "text-faint"}
              title={
                isReal
                  ? "Real manufacturer CAD model"
                  : "Accurate dimensions, simplified shape - no open model exists"
              }
            >
              {isReal ? "REAL" : "APPROX"}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onAdd(spec, params)}
          disabled={loading}
          title={
            isReal
              ? `Download the real CAD model of ${spec.name}`
              : `Add ${spec.name} to the stage`
          }
          className="shrink-0 rounded-md bg-raised-hi px-2 py-1 text-[14px] font-medium text-text transition-colors hover:bg-accent hover:text-accent-ink disabled:opacity-50"
        >
          {loading ? "..." : "Add"}
        </button>
      </div>

      {hasParams && expanded ? (
        <div className="space-y-2 border-t border-line px-2.5 py-2">
          {specParams.map((param) => (
            <label key={param.key} className="block">
              <div className="flex items-baseline justify-between">
                <span className="text-[13.5px] text-dim">{param.label}</span>
                <span className="font-mono text-[13px] text-text tabular-nums">
                  {params[param.key]}
                  {param.unit}
                </span>
              </div>
              <input
                type="range"
                className="mt-1.5"
                min={param.min}
                max={param.max}
                step={param.step}
                value={params[param.key]}
                onChange={(event) =>
                  setParams((current) => ({
                    ...current,
                    [param.key]: Number(event.target.value),
                  }))
                }
              />
            </label>
          ))}
          <p className="text-[13px] leading-snug text-faint">{spec.summary}</p>
        </div>
      ) : null}
    </li>
  );
}
