import { describe, expect, it } from "vitest";
import {
  FALLBACK_TYPE,
  protectiveImageHeaders,
  safeImageContentType,
  sanitizeFilename,
} from "./safeImageType";

describe("safeImageContentType", () => {
  it.each(["image/png", "image/jpeg", "image/webp", "image/gif"])(
    "passes through the known image type %s",
    (type) => {
      expect(safeImageContentType(type)).toBe(type);
    },
  );

  /**
   * The actual vulnerability: ComfyUI is unauthenticated and accepts uploads,
   * so a planted file could be served as HTML and execute on this origin.
   */
  it.each([
    "text/html",
    "text/html; charset=utf-8",
    "application/xhtml+xml",
    "image/svg+xml",
    "text/javascript",
  ])("downgrades the document type %s", (type) => {
    expect(safeImageContentType(type)).toBe(FALLBACK_TYPE);
  });

  it("is not fooled by casing or padding", () => {
    expect(safeImageContentType("  TEXT/HTML  ")).toBe(FALLBACK_TYPE);
    expect(safeImageContentType("IMAGE/PNG")).toBe("image/png");
  });

  it("ignores parameters when matching", () => {
    expect(safeImageContentType("image/png; charset=binary")).toBe("image/png");
  });

  it("falls back when the header is missing", () => {
    expect(safeImageContentType(null)).toBe(FALLBACK_TYPE);
    expect(safeImageContentType("")).toBe(FALLBACK_TYPE);
  });
});

describe("protectiveImageHeaders", () => {
  it("blocks MIME sniffing and document treatment", () => {
    const headers = protectiveImageHeaders("image/png", "render.png");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Content-Security-Policy"]).toContain("sandbox");
    expect(headers["Content-Disposition"]).toContain("inline");
  });
});

describe("sanitizeFilename", () => {
  it("strips quotes that would break out of the header", () => {
    expect(sanitizeFilename('a".png')).not.toContain('"');
  });

  it("strips CR/LF that would allow header injection", () => {
    const result = sanitizeFilename("a\r\nX-Evil: 1");
    expect(result).not.toContain("\r");
    expect(result).not.toContain("\n");
  });

  it("falls back to a safe name when nothing usable remains", () => {
    expect(sanitizeFilename('"""')).toBe("image");
  });
});

describe("sanitizeFilename strips the whole control range", () => {
  it.each([
    ["NUL", "\u0000"],
    ["unit separator", "\u001f"],
    ["bell", "\u0007"],
    ["vertical tab", "\u000b"],
  ])("removes %s", (_label, character) => {
    const result = sanitizeFilename(`ren${character}der.png`);
    expect(result).toBe("render.png");
    expect([...result].every((c) => c.charCodeAt(0) > 0x1f)).toBe(true);
  });

  it("keeps ordinary filenames intact", () => {
    expect(sanitizeFilename("studio_00042.png")).toBe("studio_00042.png");
  });
});

describe("svg is never served inline", () => {
  /** SVG is an image type but can carry script, so it must not pass through. */
  it("downgrades image/svg+xml", () => {
    expect(safeImageContentType("image/svg+xml")).toBe(FALLBACK_TYPE);
  });
});
