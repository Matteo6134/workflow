/**
 * Decides the Content-Type a proxied image may be served with.
 *
 * Reflecting an upstream Content-Type verbatim is a stored-XSS hole: ComfyUI
 * ships unauthenticated and its /upload/image endpoint accepts arbitrary files,
 * so a file placed in its input/output/temp directory could come back as
 * text/html and the browser would execute it ON THIS APP'S ORIGIN.
 *
 * Anything that is not a known raster image type is downgraded to an opaque
 * binary type, which browsers will not render as a document. Note that
 * image/svg+xml is deliberately NOT allowed: SVG can carry script.
 */

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/** Served when the upstream type is missing, unknown, or unsafe. */
export const FALLBACK_TYPE = "application/octet-stream";

export function safeImageContentType(raw: string | null): string {
  if (!raw) return FALLBACK_TYPE;

  // Strip any parameters (charset, boundary) and normalise before matching.
  const base = raw.split(";")[0].trim().toLowerCase();
  return ALLOWED.has(base) ? base : FALLBACK_TYPE;
}

/**
 * Headers that stop a proxied response being treated as a document even if the
 * type check is somehow bypassed.
 */
export function protectiveImageHeaders(
  contentType: string,
  filename: string,
): Record<string, string> {
  return {
    "Content-Type": contentType,
    // Stops the browser MIME-sniffing its way back to text/html.
    "X-Content-Type-Options": "nosniff",
    // Render in place, but never as a top-level document on our origin.
    "Content-Disposition": `inline; filename="${sanitizeFilename(filename)}"`,
    "Content-Security-Policy": "sandbox; default-src 'none'",
    "Cache-Control": "private, max-age=3600",
  };
}

/**
 * Keeps quotes and control characters out of the Content-Disposition header.
 *
 * A bare CR or LF here would let a crafted filename inject extra response
 * headers, so the whole C0 control range goes, along with quotes and slashes.
 */
export function sanitizeFilename(filename: string): string {
  const withoutControls = Array.from(filename)
    .filter((character) => character.charCodeAt(0) > 0x1f)
    .join("");

  const cleaned = withoutControls.replace(/["\\/]/g, "").trim();
  return cleaned.slice(0, 100) || "image";
}
