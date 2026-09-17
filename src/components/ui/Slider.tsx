"use client";

type SliderProps = {
  readonly label: string;
  /** Explains what the control does in plain language, not model jargon. */
  readonly hint?: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly onChange: (value: number) => void;
  /** Formats the displayed value, e.g. as a percentage. */
  readonly format?: (value: number) => string;
  readonly disabled?: boolean;
};

export function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => String(v),
  disabled = false,
}: SliderProps) {
  return (
    <label className={`block ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[16px] font-medium text-text">{label}</span>
        <span className="font-mono text-[14px] text-dim tabular-nums">
          {format(value)}
        </span>
      </div>

      {hint ? <p className="mt-0.5 text-[14px] leading-snug text-faint">{hint}</p> : null}

      <input
        type="range"
        className="mt-2"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export const asPercent = (value: number) => `${Math.round(value * 100)}%`;
