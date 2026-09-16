"use client";

import type { SceneItem } from "@/lib/scene/sceneItem";

type SceneGraphProps = {
  readonly items: readonly SceneItem[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly onToggleVisible: (id: string) => void;
  readonly onToggleGhost: (id: string) => void;
  readonly onRemove: (id: string) => void;
};

export function SceneGraph({
  items,
  selectedId,
  onSelect,
  onToggleVisible,
  onToggleGhost,
  onRemove,
}: SceneGraphProps) {
  if (items.length === 0) {
    return (
      <p className="px-1 text-[11px] leading-relaxed text-faint">
        Nothing on the stage yet. Import your product, then add electronics from
        the library below.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <li key={item.id}>
            <div
              className={`group flex items-center gap-1.5 rounded-md border px-2 py-1.5 transition-colors ${
                selected
                  ? "border-accent/60 bg-[rgba(199,247,81,0.07)]"
                  : "border-transparent hover:border-line hover:bg-raised"
              }`}
            >
              <button
                type="button"
                onClick={() => onToggleVisible(item.id)}
                title={item.visible ? "Hide" : "Show"}
                aria-label={item.visible ? "Hide" : "Show"}
                className="shrink-0 text-faint transition-colors hover:text-text"
              >
                <EyeIcon open={item.visible} />
              </button>

              <button
                type="button"
                onClick={() => onSelect(selected ? null : item.id)}
                className="min-w-0 flex-1 text-left"
              >
                <span
                  className={`block truncate text-[12px] ${
                    item.visible ? "text-text" : "text-faint line-through"
                  }`}
                  title={item.name}
                >
                  {item.name}
                </span>
                <span className="block truncate font-mono text-[9.5px] text-faint">
                  {item.kind === "product" ? "product" : "component"}
                  {item.dimensionsMm
                    ? ` · ${fmt(item.dimensionsMm.x)}x${fmt(item.dimensionsMm.y)}x${fmt(
                        item.dimensionsMm.z,
                      )} mm`
                    : ""}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onToggleGhost(item.id)}
                title={
                  item.ghosted
                    ? "Make solid again"
                    : "See through it - shows the parts inside"
                }
                aria-label="Toggle x-ray"
                aria-pressed={item.ghosted}
                className={`shrink-0 transition-colors ${
                  item.ghosted ? "text-accent" : "text-faint hover:text-text"
                }`}
              >
                <GhostIcon />
              </button>

              <button
                type="button"
                onClick={() => onRemove(item.id)}
                title="Remove"
                aria-label="Remove"
                className="shrink-0 text-faint opacity-0 transition-all hover:text-danger group-hover:opacity-100"
              >
                <TrashIcon />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function fmt(value: number): string {
  return value >= 100 ? value.toFixed(0) : value.toFixed(1);
}

function EyeIcon({ open }: { readonly open: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      {open ? (
        <>
          <path
            d="M1.5 8S3.8 3.5 8 3.5 14.5 8 14.5 8 12.2 12.5 8 12.5 1.5 8 1.5 8Z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
        </>
      ) : (
        <>
          <path
            d="M2 8s2.3-4.5 6-4.5c1 0 1.9.3 2.7.7M14 8s-2.3 4.5-6 4.5c-1 0-1.9-.3-2.6-.7"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path d="m2.5 2.5 11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function GhostIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2.5"
        y="2.5"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="2.2 1.6"
      />
      <circle cx="8" cy="8" r="2.2" fill="currentColor" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
