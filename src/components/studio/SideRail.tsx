"use client";

import { useRef, type ReactNode } from "react";
import { ComponentLibrary } from "./ComponentLibrary";
import { PANEL_ATTR } from "@/lib/board/wheelTarget";
import type { ComponentSpec } from "@/lib/catalog";
import type { BackendStatusView } from "@/lib/scene/useStudio";

type SideRailProps = {
  readonly status: BackendStatusView | null;
  readonly loadingModel: boolean;
  readonly loadingComponentId: string | null;
  readonly libraryOpen: boolean;
  readonly zoom: number;
  readonly canEdit: boolean;
  readonly onImport: (file: File) => void;
  readonly onAddComponent: (
    spec: ComponentSpec,
    params: Record<string, number>,
  ) => void;
  readonly onToggleLibrary: () => void;
  readonly onOpenEditor: () => void;
  readonly onZoom: (factor: number) => void;
  readonly onAddNote: () => void;
  readonly guideOpen: boolean;
  readonly onToggleGuide: () => void;
};

/**
 * The single piece of chrome, down the left edge.
 *
 * Vertical rather than a bottom bar because the board is scanned left to right
 * along the pipeline — a horizontal bar cut into that, while a rail bounds it.
 * It also absorbs the connection status that used to sit in a top bar, so the
 * board keeps its full height and there is only one place to look for controls.
 */
export function SideRail({
  status,
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
  onAddNote,
  guideOpen,
  onToggleGuide,
}: SideRailProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="pointer-events-none flex h-full items-start gap-3">
      <nav
        {...{ [PANEL_ATTR]: "true" }}
        className="glass backdrop-blur-2xl backdrop-saturate-150 pointer-events-auto flex h-full w-[92px] shrink-0 flex-col items-center gap-2 rounded-xl py-3"
        aria-label="Studio controls"
      >

        <input
          ref={inputRef}
          type="file"
          accept=".stl,.obj,.glb,.gltf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            // Reset so re-selecting the same file still fires a change event.
            event.target.value = "";
          }}
        />

        <RailButton
          label={loadingModel ? "Reading" : "Add 3D"}
          title="Import an STL, OBJ or GLB"
          tour="add-3d"
          primary
          disabled={loadingModel}
          onClick={() => inputRef.current?.click()}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          }
        />


        <Divider />

        <RailButton
          label="Parts"
          title="Electronics library"
          active={libraryOpen}
          onClick={onToggleLibrary}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect
                x="7"
                y="7"
                width="10"
                height="10"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          }
        />

        <RailButton
          label="Place"
          title="Position parts in 3D"
          disabled={!canEdit}
          onClick={onOpenEditor}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M4 7.5 12 12l8-4.5M12 12v9"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          }
        />

        <RailButton
          label="Note"
          title="Add a note to the board"
          onClick={onAddNote}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 4.5h14v11l-4.5 4.5H5v-15Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M19 15.5h-4.5V20M8.5 9h7M8.5 12.5h5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />

        <RailButton
          label="Guide"
          title="Show the getting-started checklist"
          active={guideOpen}
          onClick={onToggleGuide}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M9.5 9.2a2.6 2.6 0 1 1 3.3 2.5c-.5.2-.8.6-.8 1.1v.7"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <circle cx="12" cy="16.6" r="1" fill="currentColor" />
            </svg>
          }
        />

        <div className="mt-auto flex w-full flex-col items-center gap-2">
          <Divider />

          <div className="flex w-full items-center justify-center gap-1">
            <ZoomButton onClick={() => onZoom(1 / 1.2)} label="Zoom out">
              −
            </ZoomButton>
            <ZoomButton onClick={() => onZoom(1.2)} label="Zoom in">
              +
            </ZoomButton>
          </div>
          <span className="font-mono text-[12px] text-faint tabular-nums">
            {Math.round(zoom * 100)}%
          </span>

          <Divider />

          {/* Connection state lives here now that the top bar is gone; a red
              dot is the first thing to check when a render will not start. */}
          <StatusDot
            ok={Boolean(status && status.backendLive && !status.backendError)}
            label={shortBackend(status?.activeBackend)}
            detail={status?.backendError ?? status?.activeBackend ?? null}
          />
          <StatusDot
            ok={Boolean(status?.instagramReady)}
            label={status?.instagramReady ? "Posting" : "Instagram"}
            detail={
              status?.instagramReady
                ? status.quotaUsed !== null
                  ? `${status.quotaUsed}/50 posts used in 24h`
                  : null
                : "Not connected - see INSTAGRAM_SETUP.md"
            }
          />
        </div>
      </nav>

      {libraryOpen ? (
        <div
          {...{ [PANEL_ATTR]: "true" }}
          className="glass backdrop-blur-2xl backdrop-saturate-150 pointer-events-auto max-h-full w-[340px] overflow-y-auto rounded-xl p-3"
        >
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold text-text">Electronics</h2>
            <span className="text-[12px] text-faint">real manufacturer CAD</span>
          </div>
          <ComponentLibrary
            onAdd={onAddComponent}
            loadingId={loadingComponentId}
          />
        </div>
      ) : null}
    </div>
  );
}

/** "ComfyUI (your own GPU)" -> "ComfyUI", so the rail label is not truncated. */
function shortBackend(label: string | undefined): string {
  if (!label) return "checking";
  return label.split(" (")[0];
}

function Divider() {
  return <span className="my-0.5 h-px w-8 shrink-0 bg-line" aria-hidden />;
}

function RailButton({
  label,
  title,
  icon,
  onClick,
  active = false,
  primary = false,
  disabled = false,
  tour,
}: {
  readonly label: string;
  readonly title: string;
  readonly tour?: string;
  readonly icon: ReactNode;
  readonly onClick: () => void;
  readonly active?: boolean;
  readonly primary?: boolean;
  readonly disabled?: boolean;
}) {
  const tone = primary
    ? "bg-accent text-accent-ink hover:brightness-110"
    : active
      ? "bg-[rgba(199,247,81,0.16)] text-accent"
      : "text-dim hover:bg-raised-hi hover:text-text";

  return (
    <button
      type="button"
      title={title}
      data-tour={tour}
      onClick={onClick}
      disabled={disabled}
      className={`flex w-[60px] flex-col items-center gap-0.5 rounded-lg px-1 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${tone}`}
    >
      {icon}
      <span className="text-[12px] font-medium leading-none">{label}</span>
    </button>
  );
}

function ZoomButton({
  children,
  onClick,
  label,
}: {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md bg-raised text-[17px] leading-none text-dim transition-colors hover:bg-raised-hi hover:text-text"
    >
      {children}
    </button>
  );
}

function StatusDot({
  ok,
  label,
  detail,
}: {
  readonly ok: boolean;
  readonly label: string;
  readonly detail: string | null;
}) {
  return (
    <span
      title={detail ?? label}
      className="flex w-full items-center gap-1.5 px-2.5"
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          ok ? "bg-ok" : "bg-danger pulse-dot"
        }`}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-[12px] text-faint">
        {label}
      </span>
    </span>
  );
}
