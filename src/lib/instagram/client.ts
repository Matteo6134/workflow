import {
  InstagramError,
  type AccountInfo,
  type PublishRequest,
  type PublishResult,
  type PublishingQuota,
} from "./types";

/**
 * Two ways to reach the Content Publishing API:
 *
 *  - "instagram": graph.instagram.com, using Instagram Login. No Facebook Page
 *    required. Simpler, and the right default for someone posting to their own
 *    account.
 *  - "facebook": graph.facebook.com, the older path. Requires the Instagram
 *    account to be linked to a Facebook Page.
 *
 * The request shapes are identical, so only the host differs.
 */
export type InstagramLoginType = "instagram" | "facebook";

const GRAPH_HOSTS: Record<InstagramLoginType, string> = {
  instagram: "https://graph.instagram.com",
  facebook: "https://graph.facebook.com",
};

/** Video containers need processing time before they can be published. */
const CONTAINER_POLL_INTERVAL_MS = 3000;
const CONTAINER_MAX_POLLS = 100; // ~5 minutes

export type InstagramConfig = {
  readonly userId: string | undefined;
  readonly accessToken: string | undefined;
  readonly graphVersion: string;
  readonly loginType: InstagramLoginType;
};

export function createInstagramClient(config: InstagramConfig) {
  const { userId, accessToken, graphVersion, loginType } = config;
  const configured = Boolean(userId && accessToken);

  const host = GRAPH_HOSTS[loginType] ?? GRAPH_HOSTS.instagram;
  const base = (path: string) => `${host}/${graphVersion}/${path}`;

  function requireConfig(): { userId: string; accessToken: string } {
    if (!userId || !accessToken) {
      throw new InstagramError(
        "Instagram is not connected. Set IG_USER_ID and IG_ACCESS_TOKEN in .env.local - " +
          "see INSTAGRAM_SETUP.md for how to obtain them.",
        503,
      );
    }
    return { userId, accessToken };
  }

  return {
    isConfigured: () => configured,

    /** Confirms the token works and names the account being posted to. */
    async account(): Promise<AccountInfo> {
      const { userId: id, accessToken: token } = requireConfig();
      const data = await graphGet(
        base(`${id}?fields=id,username,profile_picture_url&access_token=${token}`),
      );
      return {
        id: String(data.id ?? id),
        username: String(data.username ?? "unknown"),
        profilePictureUrl: (data.profile_picture_url as string) ?? null,
      };
    },

    async quota(): Promise<PublishingQuota> {
      const { userId: id, accessToken: token } = requireConfig();
      const data = await graphGet(
        base(`${id}/content_publishing_limit?fields=quota_usage&access_token=${token}`),
      );
      const rows = data.data;
      const row = Array.isArray(rows) ? rows[0] : undefined;
      return { used: Number(row?.quota_usage ?? 0), limit: 50 };
    },

    /**
     * Two-step publish, as Instagram requires:
     *   1. create a media container from a PUBLIC url
     *   2. publish that container
     * Video containers are polled until transcoding finishes.
     */
    async publish(request: PublishRequest): Promise<PublishResult> {
      const { userId: id, accessToken: token } = requireConfig();
      assertPublicUrl(request.mediaUrl);

      const creationId = await createContainer(base, id, token, request);

      if (request.mediaType === "REELS") {
        await awaitContainerReady(base, creationId, token);
      }

      const published = await graphPost(base(`${id}/media_publish`), {
        creation_id: creationId,
        access_token: token,
      });

      const mediaId = String(published.id ?? "");
      if (!mediaId) throw new InstagramError("Instagram did not return a media id");

      return { mediaId, permalink: await fetchPermalink(base, mediaId, token) };
    },
  };
}

async function createContainer(
  base: (p: string) => string,
  userId: string,
  token: string,
  request: PublishRequest,
): Promise<string> {
  const params: Record<string, string> = {
    caption: request.caption,
    access_token: token,
  };

  if (request.mediaType === "REELS") {
    params.media_type = "REELS";
    params.video_url = request.mediaUrl;
    if (request.coverUrl) params.cover_url = request.coverUrl;
  } else {
    params.image_url = request.mediaUrl;
  }

  const data = await graphPost(base(`${userId}/media`), params);
  const id = String(data.id ?? "");
  if (!id) throw new InstagramError("Instagram did not return a container id");
  return id;
}

async function awaitContainerReady(
  base: (p: string) => string,
  creationId: string,
  token: string,
): Promise<void> {
  for (let attempt = 0; attempt < CONTAINER_MAX_POLLS; attempt += 1) {
    const data = await graphGet(
      base(`${creationId}?fields=status_code,status&access_token=${token}`),
    );
    const status = String(data.status_code ?? "");

    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new InstagramError(
        `Instagram could not process the video (${status}): ${data.status ?? "no detail"}. ` +
          "Reels must be MP4/MOV, H.264, 3-90s, 9:16 recommended.",
      );
    }
    await sleep(CONTAINER_POLL_INTERVAL_MS);
  }
  throw new InstagramError("Timed out waiting for Instagram to process the video", 504);
}

async function fetchPermalink(
  base: (p: string) => string,
  mediaId: string,
  token: string,
): Promise<string | null> {
  try {
    const data = await graphGet(
      base(`${mediaId}?fields=permalink&access_token=${token}`),
    );
    return (data.permalink as string) ?? null;
  } catch {
    // The post itself succeeded; only the convenience link is missing.
    return null;
  }
}

/** Meta fetches media from its own servers, so local URLs can never work. */
function assertPublicUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new InstagramError(`"${url}" is not a valid URL`, 400);
  }

  const host = parsed.hostname.toLowerCase();
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host);

  if (isLocal) {
    throw new InstagramError(
      "Instagram fetches media from its own servers, so it cannot read a local URL " +
        `(${host}). Renders from a local ComfyUI must be uploaded to public storage first.`,
      400,
    );
  }
}

type GraphBody = Record<string, unknown>;

async function graphGet(url: string): Promise<GraphBody> {
  return readGraph(await safeFetch(url));
}

async function graphPost(
  url: string,
  params: Record<string, string>,
): Promise<GraphBody> {
  return readGraph(
    await safeFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    }),
  );
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new InstagramError(
      `Could not reach the Instagram Graph API: ${detail}`,
      503,
    );
  }
}

/** Turns opaque Meta error codes into something the user can act on. */
async function readGraph(res: Response): Promise<GraphBody> {
  const body = (await res.json().catch(() => ({}))) as GraphBody & {
    error?: { message?: string; code?: number; error_subcode?: number };
  };

  if (res.ok && !body.error) return body;

  const error = body.error ?? {};
  const message = error.message ?? `HTTP ${res.status}`;

  if (error.code === 190) {
    throw new InstagramError(
      `Access token is invalid or expired: ${message}. Generate a new long-lived token.`,
      401,
    );
  }
  if (error.code === 200 || error.code === 10) {
    throw new InstagramError(
      `Permission denied: ${message}. The account must be a Business or Creator ` +
        "account and the app needs instagram_content_publish. On the Facebook " +
        "Login path it must also be linked to a Facebook Page.",
      403,
    );
  }
  if (error.code === 4 || error.code === 17 || error.code === 32) {
    throw new InstagramError(
      `Rate limit reached: ${message}. Instagram allows 50 posts per 24 hours.`,
      429,
    );
  }
  if (error.code === 9004) {
    throw new InstagramError(
      `Instagram could not download the media: ${message}. The URL must be publicly reachable.`,
      400,
    );
  }
  throw new InstagramError(`Instagram error: ${message}`, res.status || 502);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
