/** What Instagram is being asked to publish. */
export type PublishMediaType = "IMAGE" | "REELS";

export type PublishRequest = {
  readonly mediaType: PublishMediaType;
  /** Must be reachable from Meta servers - not localhost, not a data URL. */
  readonly mediaUrl: string;
  readonly caption: string;
  /** Reels only: optional custom cover frame. */
  readonly coverUrl?: string;
};

export type PublishResult = {
  readonly mediaId: string;
  readonly permalink: string | null;
};

export type AccountInfo = {
  readonly id: string;
  readonly username: string;
  readonly profilePictureUrl: string | null;
};

/** Remaining posts in the rolling 24-hour publishing window (max 50). */
export type PublishingQuota = {
  readonly used: number;
  readonly limit: number;
};

export class InstagramError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "InstagramError";
    this.status = status;
  }
}
