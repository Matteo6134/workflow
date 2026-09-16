# Connecting Instagram

This is the last step of the pipeline and is entirely optional — everything up
to and including rendering works without it.

## What you need

- An Instagram **Business** or **Creator** account. Personal accounts cannot use
  the publishing API at all; converting is free and takes a minute in the
  Instagram app under Settings → Account type.
- A [Meta developer app](https://developers.facebook.com/apps).

## Two paths, and which to pick

Meta offers two ways to reach the Content Publishing API. This app supports
both; pick with `IG_LOGIN_TYPE`.

### `IG_LOGIN_TYPE=instagram` (default, simpler)

Uses `graph.instagram.com` with **Instagram Login**. **No Facebook Page is
required.** This is the right choice for posting to your own account.

1. In your Meta app, add the **Instagram** product and choose Instagram Login.
2. Add your Instagram account as a tester and accept the invite from the
   Instagram app (Settings → Apps and websites).
3. Generate a long-lived access token with the `instagram_business_basic` and
   `instagram_business_content_publish` scopes.
4. Your Instagram user id comes back with the token, or from `GET /me`.

### `IG_LOGIN_TYPE=facebook`

Uses `graph.facebook.com`. Requires the Instagram account to be linked to a
Facebook Page, and the app to hold `instagram_basic`,
`instagram_content_publish` and `pages_show_list`. Choose this only if your
setup already runs through a Page.

## Configure

In `.env.local`:

```bash
IG_LOGIN_TYPE=instagram
IG_USER_ID=<your instagram user id>
IG_ACCESS_TOKEN=<long-lived token>
IG_GRAPH_VERSION=v21.0
```

Restart the dev server. The top bar shows the connected account, and the app
verifies the token actually works rather than just checking it is present.

## Things that will bite you

**Media must be at a public URL.** Instagram downloads it from its own servers —
you cannot upload bytes. fal.ai returns public CDN URLs, so those post directly.
A render from a local ComfyUI is unreachable; the app detects this and tells you
to re-host it rather than letting Meta fail with an opaque code.

**JPEG, not PNG.** The render backend already outputs JPEG for this reason.

**50 posts per rolling 24 hours.** The top bar shows your usage.

**Long-lived tokens expire after 60 days** and need refreshing.

## Error messages

Meta's error codes are famously unhelpful, so they are translated:

| Code | Shown as |
|---|---|
| 190 | Token invalid or expired — generate a new long-lived token |
| 200 / 10 | Permission denied — account type or missing scope |
| 4 / 17 / 32 | Rate limit — 50 posts per 24 hours |
| 9004 | Instagram could not download the media — URL not publicly reachable |
