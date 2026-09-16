import { describe, expect, it } from "vitest";
import { createInstagramClient } from "./client";
import { InstagramError } from "./types";

const connected = createInstagramClient({
  userId: "1784",
  accessToken: "token",
  graphVersion: "v21.0",
  loginType: "instagram",
});

function publishTo(mediaUrl: string) {
  return connected.publish({ mediaType: "IMAGE", mediaUrl, caption: "hi" });
}

describe("instagram client configuration", () => {
  it("reports when credentials are missing", () => {
    const client = createInstagramClient({
      userId: undefined,
      accessToken: undefined,
      graphVersion: "v21.0",
      loginType: "instagram",
    });
    expect(client.isConfigured()).toBe(false);
  });

  it("fails with setup guidance instead of calling the API unconfigured", async () => {
    const client = createInstagramClient({
      userId: undefined,
      accessToken: undefined,
      graphVersion: "v21.0",
      loginType: "instagram",
    });

    await expect(
      client.publish({ mediaType: "IMAGE", mediaUrl: "https://a.com/x.jpg", caption: "" }),
    ).rejects.toThrow(/IG_USER_ID/);
  });
});

/**
 * These assertions matter because Instagram downloads media from its own
 * servers. A local URL fails deep inside the Graph API with an opaque code, so
 * it is rejected up front with an explanation instead.
 */
describe("public URL guard", () => {
  it.each([
    "http://localhost:3000/render.jpg",
    "http://127.0.0.1:8188/view?filename=a.png",
    "http://192.168.1.50/render.jpg",
    "http://10.0.0.8/render.jpg",
    "http://172.16.4.2/render.jpg",
    "http://my-pc.local/render.jpg",
  ])("rejects the unreachable URL %s", async (url) => {
    await expect(publishTo(url)).rejects.toBeInstanceOf(InstagramError);
    await expect(publishTo(url)).rejects.toThrow(/cannot read a local URL/);
  });

  it("rejects a malformed URL", async () => {
    await expect(publishTo("not a url")).rejects.toThrow(/not a valid URL/);
  });

  it("does not reject a public CDN URL at the guard stage", async () => {
    // Reaches the network call, so it fails for a reason other than the guard.
    await expect(
      publishTo("https://v3.fal.media/files/abc/render.jpg"),
    ).rejects.not.toThrow(/cannot read a local URL/);
  });
});
