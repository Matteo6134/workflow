"use client";

import type { BackendStatusView } from "@/lib/scene/useStudio";

type TopBarProps = {
  readonly status: BackendStatusView | null;
};

export function TopBar({ status }: TopBarProps) {
  return (
    <header className="glass pointer-events-auto flex h-11 items-center justify-between gap-3 rounded-xl px-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[14px] font-bold text-accent-ink">
          S
        </span>
        <div className="leading-none">
          <p className="text-[16px] font-semibold text-text">Studio</p>
          <p className="mt-0.5 text-[12px] text-faint">
            3D to render to Instagram
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Pill
          ok={Boolean(status && !status.backendError)}
          label={status?.activeBackend ?? "checking..."}
          detail={status?.backendError ?? null}
        />
        <Pill
          ok={Boolean(status?.instagramReady)}
          label={
            status?.instagramReady
              ? `@${status.instagramUsername}`
              : "Instagram off"
          }
          detail={
            status?.instagramReady
              ? status.quotaUsed !== null
                ? `${status.quotaUsed}/50 posts used in the last 24h`
                : null
              : "Not connected - see INSTAGRAM_SETUP.md"
          }
        />
      </div>
    </header>
  );
}

function Pill({
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
      className="flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 text-[13.5px] text-dim"
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          ok ? "bg-ok" : "bg-danger pulse-dot"
        }`}
        aria-hidden
      />
      <span className="max-w-[160px] truncate">{label}</span>
    </span>
  );
}
