import { NextResponse } from "next/server";
import { createInstagramClient } from "@/lib/instagram/client";
import { InstagramError } from "@/lib/instagram/types";
import { publishRequestSchema } from "@/lib/validation/render";
import { env } from "@/lib/env";

/** Reels containers can take minutes to transcode before they can be published. */
export const maxDuration = 300;

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body is not valid JSON" }, { status: 400 });
  }

  const parsed = publishRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid publish request",
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const client = createInstagramClient(env.instagram);

  try {
    const result = await client.publish({
      mediaType: "IMAGE",
      mediaUrl: parsed.data.imageUrl,
      caption: parsed.data.caption,
    });
    return NextResponse.json(result);
  } catch (cause) {
    if (cause instanceof InstagramError) {
      return NextResponse.json({ error: cause.message }, { status: cause.status });
    }
    console.error("Unexpected publish failure", cause);
    return NextResponse.json(
      { error: "Publishing failed unexpectedly. Check the server logs." },
      { status: 500 },
    );
  }
}
