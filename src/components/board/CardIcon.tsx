"use client";

export type CardIconKind = "product" | "part" | "look" | "renders";

/**
 * Identifies a card at a glance.
 *
 * Drawn from the workbench's own vernacular rather than generic UI glyphs: an
 * isometric box for the imported product, an IC with legs for an electronics
 * part, an aperture for the look, a frame stack for outputs. At board zoom the
 * silhouette is what you read, so each one has a clearly different outline.
 */
export function CardIcon({ kind }: { readonly kind: CardIconKind }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
  };

  if (kind === "product") {
    return (
      <svg {...common}>
        <path
          d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M4 7.5 12 12l8-4.5M12 12v9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === "part") {
    return (
      <svg {...common}>
        <rect
          x="7"
          y="7"
          width="10"
          height="10"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "look") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 3.5 15.5 12 12 20.5M12 3.5 8.5 12 12 20.5M3.5 12h17"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect
        x="3"
        y="6"
        width="14"
        height="12"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M7 14.5 9.8 11.5 12 13.8 14.2 11 17 14.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 9v10a1.5 1.5 0 0 1-1.5 1.5H8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
