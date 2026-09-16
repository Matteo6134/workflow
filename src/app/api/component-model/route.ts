import { NextResponse } from "next/server";
import { isAllowedModelUrl } from "@/lib/catalog/sources";

export const dynamic = "force-dynamic";

/** Upstream models are immutable per commit, so cache them hard. */
const CACHE_CONTROL = "public, max-age=86400, immutable";

/** Guards against a malformed URL pulling down something enormous. */
const MAX_BYTES = 24 * 1024 * 1024;

/**
 * Proxies a component model from an allow-listed public library.
 *
 * Needed because raw.githubusercontent.com does not send CORS headers the
 * browser will accept for these files. The allow-list is checked against the
 * fully-resolved URL, so this cannot be used to reach an internal host.
 */
export async function GET(request: Request): Promise<Response> {
  const src = new URL(request.url).searchParams.get("src");

  if (!src) {
    return NextResponse.json({ error: "src is required" }, { status: 400 });
  }

  if (!isAllowedModelUrl(src)) {
    return NextResponse.json(
      { error: "That model source is not allow-listed" },
      { status: 403 },
    );
  }

  try {
    const upstream = await fetch(src, {
      headers: { Accept: "*/*" },
      // Never follow a redirect off the allow-listed host.
      redirect: "error",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Model source responded ${upstream.status}` },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }

    const length = Number(upstream.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) {
      return NextResponse.json({ error: "Model is too large" }, { status: 413 });
    }

    const body = await upstream.arrayBuffer();
    if (body.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Model is too large" }, { status: 413 });
    }

    return new Response(body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (cause) {
    return NextResponse.json(
      {
        error: `Could not fetch the model: ${
          cause instanceof Error ? cause.message : String(cause)
        }`,
      },
      { status: 502 },
    );
  }
}
