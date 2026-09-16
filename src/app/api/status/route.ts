import { NextResponse } from "next/server";
import { backendStatuses } from "@/lib/backends/registry";
import { createInstagramClient } from "@/lib/instagram/client";
import { env } from "@/lib/env";

/** Always reflects the live environment, never a cached build-time snapshot. */
export const dynamic = "force-dynamic";

/**
 * Drives the setup banner in the UI so a misconfiguration is visible before the
 * user spends time framing a model, rather than at the moment they hit Render.
 */
export async function GET(): Promise<NextResponse> {
  const instagram = createInstagramClient(env.instagram);

  return NextResponse.json({
    backends: await backendStatuses(),
    activeBackend: env.backend,
    instagram: await instagramStatus(instagram),
  });
}

async function instagramStatus(
  client: ReturnType<typeof createInstagramClient>,
): Promise<{
  configured: boolean;
  username: string | null;
  quotaUsed: number | null;
  quotaLimit: number;
  error: string | null;
}> {
  if (!client.isConfigured()) {
    return {
      configured: false,
      username: null,
      quotaUsed: null,
      quotaLimit: 50,
      error: "Not connected. See INSTAGRAM_SETUP.md.",
    };
  }

  try {
    // Verifies the token really works, rather than just that it is present.
    const [account, quota] = await Promise.all([client.account(), client.quota()]);
    return {
      configured: true,
      username: account.username,
      quotaUsed: quota.used,
      quotaLimit: quota.limit,
      error: null,
    };
  } catch (cause) {
    return {
      configured: false,
      username: null,
      quotaUsed: null,
      quotaLimit: 50,
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
}
