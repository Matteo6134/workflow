import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  protectiveImageHeaders,
  safeImageContentType,
} from "@/lib/http/safeImageType";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["output", "input", "temp"]);

/**
 * Streams a rendered image back from ComfyUI.
 *
 * The ComfyUI server may run on another machine, so the browser cannot always
 * reach it directly. Only the filename and folder come from the client - the
 * host is always taken from COMFYUI_URL, so this cannot be pointed at an
 * arbitrary internal address.
 */
export async function GET(request: Request): Promise<Response> {
  const baseUrl = env.comfyUrl?.replace(/\/+$/, "");
  if (!baseUrl) {
    return NextResponse.json({ error: "COMFYUI_URL is not set" }, { status: 503 });
  }

  const params = new URL(request.url).searchParams;
  const filename = params.get("filename");
  if (!filename) {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }

  // Reject traversal attempts outright rather than normalising them.
  const subfolder = params.get("subfolder") ?? "";
  if (hasTraversal(filename) || hasTraversal(subfolder)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const type = params.get("type") ?? "output";
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const target = `${baseUrl}/view?${new URLSearchParams({ filename, subfolder, type })}`;

  try {
    const upstream = await fetch(target, { cache: "no-store" });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `ComfyUI responded ${upstream.status}` },
        { status: upstream.status },
      );
    }

    // The upstream type is never reflected as-is: ComfyUI is unauthenticated
    // and can be made to serve HTML, which would then run on this origin.
    const contentType = safeImageContentType(upstream.headers.get("Content-Type"));

    return new Response(upstream.body, {
      headers: protectiveImageHeaders(contentType, filename),
    });
  } catch (cause) {
    return NextResponse.json(
      {
        error: `Cannot reach ComfyUI: ${
          cause instanceof Error ? cause.message : String(cause)
        }`,
      },
      { status: 503 },
    );
  }
}

function hasTraversal(value: string): boolean {
  return value.includes("..") || value.includes("\\") || value.startsWith("/");
}
