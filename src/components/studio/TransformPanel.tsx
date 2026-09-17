"use client";

import type { SceneItem, Vec3 } from "@/lib/scene/sceneItem";
import type { Transform, TransformMode } from "./Viewport";

type TransformPanelProps = {
  readonly item: SceneItem;
  readonly mode: TransformMode;
  readonly onModeChange: (mode: TransformMode) => void;
  readonly onChange: (transform: Transform) => void;
};

const MODES: readonly { id: TransformMode; label: string; key: string }[] = [
  { id: "translate", label: "Move", key: "G" },
  { id: "rotate", label: "Rotate", key: "R" },
  { id: "scale", label: "Scale", key: "S" },
];

/** Preset orientations, which is how a part is actually placed in practice. */
const ORIENTATIONS: readonly { label: string; rotation: Vec3 }[] = [
  { label: "Front", rotation: { x: 0, y: 0, z: 0 } },
  { label: "Back", rotation: { x: 0, y: 180, z: 0 } },
  { label: "Left", rotation: { x: 0, y: -90, z: 0 } },
  { label: "Right", rotation: { x: 0, y: 90, z: 0 } },
  { label: "Upright", rotation: { x: -90, y: 0, z: 0 } },
  { label: "Flat", rotation: { x: 0, y: 0, z: 0 } },
];

export function TransformPanel({
  item,
  mode,
  onModeChange,
  onChange,
}: TransformPanelProps) {
  const transform: Transform = {
    position: item.position,
    rotation: item.rotation,
    scale: item.scale,
  };

  const setAxis = (
    field: keyof Transform,
    axis: keyof Vec3,
    value: number,
  ): void => {
    onChange({ ...transform, [field]: { ...transform[field], [axis]: value } });
  };

  const scaleIsUniform =
    item.scale.x === item.scale.y && item.scale.y === item.scale.z;

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {MODES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onModeChange(option.id)}
            title={`${option.label} (${option.key})`}
            className={`flex-1 rounded-md px-2 py-1.5 text-[14px] font-medium transition-colors ${
              option.id === mode
                ? "bg-accent text-accent-ink"
                : "bg-raised text-dim hover:bg-raised-hi hover:text-text"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <AxisRow
        label="Position"
        unit="mm"
        value={transform.position}
        step={0.5}
        onChange={(axis, value) => setAxis("position", axis, value)}
      />

      <AxisRow
        label="Rotation"
        unit="deg"
        value={transform.rotation}
        step={5}
        onChange={(axis, value) => setAxis("rotation", axis, value)}
      />

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[13.5px] font-medium tracking-[0.01em] text-dim">
            Orient
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {ORIENTATIONS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange({ ...transform, rotation: preset.rotation })}
              className="rounded-md bg-raised px-1.5 py-1.5 text-[13.5px] text-dim transition-colors hover:bg-raised-hi hover:text-text"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <AxisRow
        label="Scale"
        unit="x"
        value={transform.scale}
        step={0.01}
        onChange={(axis, value) => setAxis("scale", axis, value)}
      />

      {/* Scaling a catalogue part breaks the dimensional accuracy it exists
          for, so say so rather than letting it pass silently. */}
      {item.kind === "component" && !isIdentity(item.scale) ? (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-2 py-1.5 text-[13px] leading-snug text-danger">
          This part is no longer at its real size
          {scaleIsUniform ? ` (${item.scale.x}x)` : ""}. Reset scale to 1 to keep
          the fit-check honest.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() =>
          onChange({
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          })
        }
        className="w-full rounded-md border border-line px-2 py-1.5 text-[14px] text-dim transition-colors hover:border-line-strong hover:text-text"
      >
        Reset transform
      </button>
    </div>
  );
}

type AxisRowProps = {
  readonly label: string;
  readonly unit: string;
  readonly value: Vec3;
  readonly step: number;
  readonly onChange: (axis: keyof Vec3, value: number) => void;
};

function AxisRow({ label, unit, value, step, onChange }: AxisRowProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13.5px] font-medium tracking-[0.01em] text-dim">
          {label}
        </span>
        <span className="font-mono text-[12px] text-faint">{unit}</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {(["x", "y", "z"] as const).map((axis) => (
          <div key={axis} className="relative">
            <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 font-mono text-[12px] uppercase text-faint">
              {axis}
            </span>
            <input
              type="number"
              className="num-field pl-4"
              step={step}
              value={value[axis]}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                // Ignore intermediate non-numeric states while typing.
                if (Number.isFinite(parsed)) onChange(axis, parsed);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function isIdentity(scale: Vec3): boolean {
  return scale.x === 1 && scale.y === 1 && scale.z === 1;
}
