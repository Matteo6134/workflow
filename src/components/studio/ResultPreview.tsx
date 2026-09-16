"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import type { RenderedImage } from "@/lib/types";

type PublishState =
  | { readonly status: "idle" }
  | { readonly status: "publishing" }
  | { readonly status: "done"; readonly permalink: string | null }
  | { readonly status: "error"; readonly message: string };

type ResultPreviewProps = {
  readonly image: RenderedImage;
  readonly instagramReady: boolean;
  readonly instagramUsername: string | null;
  readonly onClose: () => void;
};

const CAPTION_LIMIT = 2200;
const HASHTAG_LIMIT = 30;

export function ResultPreview({
  image,
  instagramReady,
  instagramUsername,
  onClose,
}: ResultPreviewProps) {
  const [caption, setCaption] = useState("");
  const [state, setState] = useState<PublishState>({ status: "idle" });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hashtags = (caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;
  const tooLong = caption.length > CAPTION_LIMIT;
  const tooManyTags = hashtags > HASHTAG_LIMIT;

  // Instagram fetches the image from its own servers, so a local ComfyUI
  // result cannot be posted without re-hosting it somewhere public first.
  const blocked = !image.publiclyReachable
    ? "This render is served from your own machine, which Instagram cannot reach. Switch to the hosted backend, or upload it to public storage first."
    : !instagramReady
      ? "Instagram is not connected. See INSTAGRAM_SETUP.md."
      : null;

  async function publish(): Promise<void> {
    setState({ status: "publishing" });
    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: image.url, caption }),
      });
      const body = await response.json();
      if (!response.ok) {
        setState({ status: "error", message: body.error ?? "Publishing failed" });
        return;
      }
      setState({ status: "done", permalink: body.permalink ?? null });
    } catch (cause) {
      setState({
        status: "error",
        message: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass flex max-h-full w-full max-w-4xl overflow-hidden rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Render preview"
      >
        <div className="flex flex-1 items-center justify-center bg-black/40 p-4">
          <img
            src={image.url}
            alt="Generated render"
            className="max-h-[70vh] w-auto rounded-lg object-contain"
          />
        </div>

        <div className="flex w-[330px] shrink-0 flex-col border-l border-line">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-dim">
              Publish
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] text-faint transition-colors hover:text-text"
            >
              Close
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <div className="flex items-center justify-between font-mono text-[10px] text-faint">
              <span>
                {image.width} x {image.height}
              </span>
              <a
                href={image.url}
                download
                target="_blank"
                rel="noreferrer"
                className="text-dim underline transition-colors hover:text-accent"
              >
                Download
              </a>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wide text-dim">
                Caption
              </span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={7}
                placeholder={"New drop.\n\n#industrialdesign #productdesign"}
                className="w-full resize-none rounded-md border border-line bg-raised px-2.5 py-2 text-[12px] leading-relaxed text-text outline-none placeholder:text-faint focus:border-accent"
              />
              <span className="mt-1 flex justify-between font-mono text-[10px]">
                <span className={tooManyTags ? "text-danger" : "text-faint"}>
                  {hashtags}/{HASHTAG_LIMIT} tags
                </span>
                <span className={tooLong ? "text-danger" : "text-faint"}>
                  {caption.length}/{CAPTION_LIMIT}
                </span>
              </span>
            </label>

            {blocked ? (
              <p className="rounded-md border border-line bg-raised px-2.5 py-2 text-[10.5px] leading-snug text-dim">
                {blocked}
              </p>
            ) : null}

            {state.status === "error" ? (
              <p className="rounded-md border border-danger/40 bg-danger/10 px-2.5 py-2 text-[10.5px] leading-snug text-danger">
                {state.message}
              </p>
            ) : null}

            {state.status === "done" ? (
              <div className="rounded-md border border-ok/40 bg-ok/10 px-2.5 py-2 text-[10.5px] leading-snug text-ok">
                Posted to Instagram.
                {state.permalink ? (
                  <>
                    {" "}
                    <a
                      href={state.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      View post
                    </a>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="border-t border-line px-4 py-3">
            <button
              type="button"
              onClick={publish}
              disabled={
                Boolean(blocked) ||
                tooLong ||
                tooManyTags ||
                state.status === "publishing" ||
                state.status === "done"
              }
              className="w-full rounded-lg bg-accent px-3 py-2.5 text-[13px] font-semibold text-accent-ink transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:bg-raised disabled:text-faint"
            >
              {state.status === "publishing"
                ? "Posting..."
                : state.status === "done"
                  ? "Posted"
                  : `Post${instagramUsername ? ` as @${instagramUsername}` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
