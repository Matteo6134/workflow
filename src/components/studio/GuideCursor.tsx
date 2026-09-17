"use client";

import { useEffect, useRef, useState } from "react";

type GuideCursorProps = {
  /** CSS selector for the control to travel to. */
  readonly targetSelector: string | null;
  /** Extra stillness, after the assistant appeared, before it demonstrates. */
  readonly delay?: number;
};

const DEFAULT_DELAY = 4000;
const TRAVEL_MS = 1150;
const HOLD_MS = 900;

/**
 * A ghost cursor that drifts to the control the user needs and mimes a click.
 *
 * It is NOT the real pointer: no browser permits a page to move the system
 * cursor, for obvious reasons. This is a demonstration — it shows where to go
 * and taps, then loops, which is as close to "take my hand" as the web allows.
 *
 * Any real input cancels it immediately. A hint that keeps animating while
 * someone is working is an irritation, not guidance.
 */
export function GuideCursor({
  targetSelector,
  delay = DEFAULT_DELAY,
}: GuideCursorProps) {
  const [armed, setArmed] = useState(false);
  const handRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const origin = useRef({ x: 0, y: 0 });

  /* Arm after extra stillness; any input disarms. */
  useEffect(() => {
    if (!targetSelector) return;

    let timer: ReturnType<typeof setTimeout>;
    const track = (event: PointerEvent) => {
      origin.current = { x: event.clientX, y: event.clientY };
    };
    const restart = () => {
      setArmed(false);
      clearTimeout(timer);
      timer = setTimeout(() => setArmed(true), delay);
    };

    restart();
    window.addEventListener("pointermove", track, { passive: true });
    for (const name of ["pointermove", "pointerdown", "keydown", "wheel"] as const) {
      window.addEventListener(name, restart, { passive: true });
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointermove", track);
      for (const name of ["pointermove", "pointerdown", "keydown", "wheel"] as const) {
        window.removeEventListener(name, restart);
      }
    };
  }, [targetSelector, delay]);

  /* Travel, tap, pause, repeat. */
  useEffect(() => {
    if (!armed || !targetSelector) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let loop: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const run = () => {
      const target = document.querySelector(targetSelector);
      const hand = handRef.current;
      if (!target || !hand || cancelled) return;

      const box = target.getBoundingClientRect();
      const to = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      const from = origin.current.x
        ? origin.current
        : { x: to.x - 220, y: to.y + 160 };

      if (reduced) {
        hand.style.transform = `translate(${to.x}px, ${to.y}px)`;
        hand.style.opacity = "1";
        return;
      }

      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - start) / TRAVEL_MS, 1);
        // Ease-out-cubic: quick departure, gentle arrival on the target.
        const eased = 1 - Math.pow(1 - t, 3);
        const x = from.x + (to.x - from.x) * eased;
        const y = from.y + (to.y - from.y) * eased;
        hand.style.transform = `translate(${x}px, ${y}px)`;
        hand.style.opacity = String(Math.min(t * 3, 1));

        if (t < 1) {
          frame = requestAnimationFrame(step);
          return;
        }

        // Arrived: tap.
        const ring = ringRef.current;
        if (ring) {
          ring.style.left = `${to.x}px`;
          ring.style.top = `${to.y}px`;
          ring.classList.remove("guide-tap");
          // Reflow so the animation restarts on every loop.
          void ring.offsetWidth;
          ring.classList.add("guide-tap");
        }

        loop = setTimeout(() => {
          if (cancelled || !hand) return;
          hand.style.opacity = "0";
          loop = setTimeout(run, 600);
        }, HOLD_MS);
      };

      frame = requestAnimationFrame(step);
    };

    run();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(loop);
    };
  }, [armed, targetSelector]);

  if (!armed || !targetSelector) return null;

  return (
    <>
      <div
        ref={ringRef}
        data-guide-ring
        className="pointer-events-none fixed z-[60] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent opacity-0"
        aria-hidden
      />
      <div
        ref={handRef}
        data-guide-cursor
        className="pointer-events-none fixed left-0 top-0 z-[61] opacity-0 transition-opacity duration-300"
        aria-hidden
      >
        <WindowsHand />
      </div>
    </>
  );
}

/**
 * The Windows "link select" pointer: a white glove with a black outline and a
 * raised index finger. Drawn rather than set as a CSS cursor, because this is a
 * ghost the page moves, not the system pointer.
 */
export function WindowsHand() {
  return (
    <svg width="26" height="32" viewBox="0 0 26 32" fill="none" aria-hidden>
      <path
        d="M9.2 13.4V4.3a2.1 2.1 0 0 1 4.2 0v7.5h.9V9.4a2 2 0 0 1 4 0v2.6h.9v-1.3a1.9 1.9 0 0 1 3.8 0V12h.5v7.4c0 5-3 9.1-7.6 9.1h-2.3c-2 0-3.5-.8-4.8-2.3L2.4 19a2 2 0 0 1 .4-2.9 2.1 2.1 0 0 1 2.8.3l3.6 3.9V13.4Z"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M13.4 16.6v4M17.5 16.6v4M21.4 16.6v4"
        stroke="#000000"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
