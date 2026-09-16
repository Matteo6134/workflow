import { NextResponse } from "next/server";
import { getBackend } from "@/lib/backends/registry";
import { BackendError } from "@/lib/backends/types";
import { renderRequestSchema } from "@/lib/validation/render";
import { DEFAULT_NEGATIVE_PROMPT } from "@/lib/types";

/** Diffusion on a hosted GPU regularly exceeds the default budget. */
export const maxDuration = 300;

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body is not valid JSON" }, { status: 400 });
  }

  const parsed = renderRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid render request",
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const { passes, settings } = parsed.data;
  const backend = getBackend();

  const configurationError = backend.configurationError();
  if (configurationError) {
    return NextResponse.json({ error: configurationError }, { status: 503 });
  }

  try {
    const output = await backend.render({
      passes,
      settings: {
        ...settings,
        negativePrompt: settings.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
      },
    });
    return NextResponse.json(output);
  } catch (cause) {
    if (cause instanceof BackendError) {
      return NextResponse.json({ error: cause.message }, { status: cause.status });
    }
    console.error("Unexpected render failure", cause);
    return NextResponse.json(
      { error: "The render failed unexpectedly. Check the server logs." },
      { status: 500 },
    );
  }
}
