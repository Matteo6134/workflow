"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type IdleAssistantProps = {
  /** What to nudge the user toward; null hides the assistant entirely. */
  readonly hint: string | null;
  /** CSS selector for the control being pointed at. */
  readonly targetSelector: string | null;
  readonly onDismiss: () => void;
  /** Milliseconds of stillness before it appears. */
  readonly idleDelay?: number;
};

const DEFAULT_IDLE_DELAY = 7000;
/** How far a pupil travels from centre, in px. */
const PUPIL_RANGE = 4;
const CHARACTER = 78;
const GAP = 18;

type Placement = {
  readonly left: number;
  readonly top: number;
  readonly side: "left" | "right";
};

/**
 * A small character that waits until you have stopped, then stands beside the
 * control you need next and points at it.
 *
 * Standing next to the target is the whole idea: a hint parked in a corner
 * makes you hunt for what it refers to, one beside the button does not. Its
 * eyes follow the cursor, which is what makes it read as watching rather than
 * as a static sticker.
 *
 * The pointing is left entirely to {@link GuideCursor}, whose hand travels to
 * the control and taps it — two hands on screen at once read as clutter.
 */
export function IdleAssistant({
  hint,
  targetSelector,
  onDismiss,
  idleDelay = DEFAULT_IDLE_DELAY,
}: IdleAssistantProps) {
  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const leftPupil = useRef<SVGGElement>(null);
  const rightPupil = useRef<SVGGElement>(null);

  /*
   * Appear only after the user has genuinely stopped. The parent remounts this
   * on a new hint, so the delay re-arms without resetting state here.
   */
  useEffect(() => {
    if (!hint) return;

    let timer: ReturnType<typeof setTimeout>;
    const restart = () => {
      // Any activity sends it away immediately. Opening a card's "+" is
      // activity, and the assistant stands exactly where that menu unfolds.
      setVisible(false);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(true), idleDelay);
    };

    restart();
    const events = ["pointermove", "pointerdown", "keydown", "wheel"] as const;
    for (const name of events) {
      window.addEventListener(name, restart, { passive: true });
    }
    return () => {
      clearTimeout(timer);
      for (const name of events) window.removeEventListener(name, restart);
    };
  }, [hint, idleDelay]);

  /* Stand beside the target, on whichever side has room for it. */
  useEffect(() => {
    if (!visible || !targetSelector) return;

    const place = () => {
      const target = document.querySelector(targetSelector);
      if (!target) {
        setPlacement(null);
        return;
      }

      const box = target.getBoundingClientRect();
      const roomRight = window.innerWidth - box.right;
      const side: "left" | "right" =
        roomRight > CHARACTER + GAP + 280 ? "right" : "left";

      setPlacement({
        left:
          side === "right"
            ? box.right + GAP
            : Math.max(8, box.left - GAP - CHARACTER),
        top: Math.min(
          Math.max(8, box.top + box.height / 2 - CHARACTER / 2),
          window.innerHeight - CHARACTER - 8,
        ),
        side,
      });
    };

    place();
    window.addEventListener("resize", place);
    // The board pans and cards move, so the anchor is re-checked periodically
    // rather than measured once.
    const poll = setInterval(place, 600);
    return () => {
      window.removeEventListener("resize", place);
      clearInterval(poll);
    };
  }, [visible, targetSelector]);

  const aim = useCallback((clientX: number, clientY: number) => {
    for (const pupil of [leftPupil.current, rightPupil.current]) {
      if (!pupil) continue;
      const box = pupil.getBoundingClientRect();
      const dx = clientX - (box.left + box.width / 2);
      const dy = clientY - (box.top + box.height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      // Normalised, so a pupil never leaves its eye however far the cursor is.
      const x = (dx / distance) * PUPIL_RANGE;
      const y = (dy / distance) * PUPIL_RANGE;
      pupil.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      // One update per frame; pointermove fires far faster than paint.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => aim(event.clientX, event.clientY));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [visible, aim]);

  if (!hint || !visible || !placement) return null;

  // Standing to the right of the target means pointing back to the left.
  const pointsLeft = placement.side === "right";

  return (
    <div
      className="assistant-enter pointer-events-none fixed z-50"
      style={{ left: placement.left, top: placement.top }}
    >
      <div
        className={`flex items-center gap-2.5 ${
          pointsLeft ? "flex-row" : "flex-row-reverse"
        }`}
      >
        <svg width={CHARACTER} height={CHARACTER} viewBox="0 0 78 78" aria-hidden>
          <rect
            x="6"
            y="8"
            width="66"
            height="62"
            rx="24"
            fill="var(--panel-solid)"
            stroke="var(--accent)"
            strokeWidth="2.5"
          />
          <circle cx="28" cy="36" r="11" fill="var(--text)" />
          <circle cx="52" cy="36" r="11" fill="var(--text)" />
          <g ref={leftPupil} style={{ transition: "transform 90ms linear" }}>
            <circle cx="28" cy="36" r="4.6" fill="var(--canvas)" />
          </g>
          <g ref={rightPupil} style={{ transition: "transform 90ms linear" }}>
            <circle cx="52" cy="36" r="4.6" fill="var(--canvas)" />
          </g>
          {/* A small smile, so it reads as friendly rather than staring. */}
          <path
            d="M31 54c2.6 2.4 13.4 2.4 16 0"
            stroke="var(--accent)"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        <div className="glass backdrop-blur-2xl backdrop-saturate-150 pointer-events-auto max-w-[260px] rounded-xl px-3 py-2.5">
          <p className="text-[13.5px] leading-snug text-text">{hint}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-1.5 text-[12.5px] text-faint underline transition-colors hover:text-text"
          >
            I&apos;ve got this
          </button>
        </div>
      </div>
    </div>
  );
}
