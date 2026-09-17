# Studio

Turn a 3D file into marketing imagery, without the render drifting away from
the product you actually designed.

You import an STL, drop in real electronics parts, describe the light and
material in plain words, and get a photoreal image. The pipeline ends at
Instagram, but that step is optional and comes last.

---

## Why the renders keep the right shape

This is the part that separates it from a general image generator. The model is
conditioned on **four control maps derived from your real geometry**, not from a
picture of it:

| Pass | What it carries | Why it matters |
|---|---|---|
| **Beauty** | Flat-shaded colour view | The starting image for img2img |
| **Depth** | Linear distance from camera | Overall form and volume |
| **Normal** | Surface direction | How light reads across each face |
| **Edges** | Hidden-line drawing of real CAD edges | **Stops the shape being redrawn** |

The edge pass is the important one. Depth and normal describe form, but they are
smooth, and a diffusion model will happily round a corner, thicken a wall or
invent a vent. A crisp line drawing taken from the mesh topology
(`EdgesGeometry`) pins the silhouette and every hard edge to the real part.

Two further choices protect dimensions:

- **World units are millimetres, always.** Models are centred but never
  rescaled. Framing is done by moving the camera. A 21 mm board placed next to a
  400 mm panel is genuinely 21 mm.
- **Control maps stay PNG.** JPEG ringing around a hard depth edge reads as real
  geometry to ControlNet and softens exactly what we are trying to lock down.

Click **"See what the AI gets"** to inspect all five passes before spending a
render. If an image drifts, these maps usually show why.

---

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

### Choosing where rendering happens

One environment variable decides this, and nothing else in the app changes:

```bash
RENDER_BACKEND=fal     # hosted GPU, a few cents per image, no hardware needed
RENDER_BACKEND=comfy   # your own or a rented GPU, no cost per image, no cap
```

**fal.ai** — set `FAL_KEY` from <https://fal.ai/dashboard/keys>. Works with no
GPU. Uses `sdxl-controlnet-union`, the one hosted endpoint that accepts depth,
normal *and* canny maps we supply ourselves with preprocessing disabled.

**ComfyUI** — see *Running on your own GPU* below. Zero marginal cost, no cap,
and the same geometry lock, with the depth and edge ControlNets chained.

The top bar shows whether the active backend is actually **reachable**, not just
whether its env vars are set — a `COMFYUI_URL` pointing at a switched-off
machine reports red with the reason, and Render is disabled rather than failing
halfway through.

---

## Running on your own GPU

`RENDER_BACKEND=comfy` is the zero-cost path, but it needs a real GPU somewhere.

> **Not this machine.** Intel UHD 770, no NVIDIA GPU, and only ~15 GB free —
> less than SDXL alone needs. A local ComfyUI here falls back to CPU and takes
> 20–45 minutes per image.

**→ Using a second PC with an NVIDIA card? See [GPU_SETUP.md](GPU_SETUP.md).**
It covers SD 1.5 on a 6 GB card (3.58 GB of models, 20–60 s per image, free),
including the GTX 16-series fp16 defect that otherwise produces black images.

**Renting instead:** RunPod, Vast.ai or Lambda, 24 GB class card — a 4090,
A5000 or L4. SDXL plus two ControlNets fits comfortably and renders in seconds.
Pick a ComfyUI template to skip the install.

Put three files on that machine:

| File | Goes in | From |
|---|---|---|
| `sd_xl_base_1.0.safetensors` | `models/checkpoints/` | `stabilityai/stable-diffusion-xl-base-1.0` (~6.9 GB) |
| `controlnet-depth-sdxl-1.0.safetensors` | `models/controlnet/` | `diffusers/controlnet-depth-sdxl-1.0` |
| `controlnet-canny-sdxl-1.0.safetensors` | `models/controlnet/` | `diffusers/controlnet-canny-sdxl-1.0` |

**The most likely thing to go wrong:** both ControlNets download as
`diffusion_pytorch_model.safetensors`. Either rename them to match the table, or
point `COMFYUI_CONTROLNET` / `COMFYUI_CONTROLNET_CANNY` at the real filenames.
No separate VAE is needed — the workflow takes it from the checkpoint.

Reach the pod with an SSH tunnel, which keeps `COMFYUI_URL` untouched:

```bash
ssh -N -L 8188:localhost:8188 root@<pod-host> -p <pod-port>
```

**Do not put basic-auth or a login proxy in front of ComfyUI.** The client sends
no `Authorization` header on any call, so an auth layer becomes an opaque
non-2xx failure.

Then restart `npm run dev` — `.env.local` is read at server start, so a running
dev server keeps the old values and makes it look like the fix failed. The top
bar pill goes green when the server answers and the three model names match;
if not, it names which half is wrong.

Verify by hand if you prefer:

```bash
curl http://localhost:8188/system_stats                       # should return JSON
curl -s http://localhost:8188/object_info | grep sd_xl_base   # should echo the name
```

`COMFYUI_TIMEOUT_MINUTES` (default 45) caps a single render. A 504 that mentions
CPU usually means the pod is not actually on GPU — check its log for
`Device: cuda`.

**Instagram stays blocked on this backend.** ComfyUI images are proxied through
your local `/api/comfy/image`, which Meta's servers cannot fetch. Render posts
on fal, or add an upload-to-public-storage step.

---

## Electronics components

Parts come from two public libraries, loaded straight into the browser:

| Source | Format | Covers |
|---|---|---|
| [Adafruit CAD Parts](https://github.com/adafruit/Adafruit_CAD_Parts) | STEP | Boards, OLED/TFT displays, NeoPixel strips, LiPo cells |
| [KiCad packages3D](https://gitlab.com/kicad/libraries/kicad-packages3D) | VRML | Buttons, LEDs, buzzers, battery holders, ESP32-WROOM |

STEP is read with OpenCascade compiled to WebAssembly
([occt-import-js](https://github.com/kovacsv/occt-import-js)), which is what
makes vendor CAD usable in a browser at all. The WASM payload is ~7 MB and is
only fetched when you actually place a STEP part.

**Both unit conventions were verified by measurement, not assumed:**

- KiCad VRML is authored in 0.1-inch units. `SW_PUSH_6mm` measures 2.3622 raw
  units across the body; `2.3622 x 2.54 = 6.00 mm`. Without that factor every
  fetched part would be 2.54x too small.
- Adafruit STEP is read as explicit millimetres. The NeoPixel strip comes out
  `224.00 x 12.00 x 1.74 mm`.

Parts marked **APPROX** in the library are dimensionally accurate stand-ins used
only where no openly licensed model exists (the LCD1602 and the classic Arduino
boards among them). The badge is always shown, so you know which you placed.

Model fetching goes through `/api/component-model`, which only accepts
allow-listed source prefixes — otherwise it would be an SSRF hole.

---

## The board

The home surface is a pan/zoom board. Everything you add becomes a card:

- **Object cards** — your product and each electronics part, with a preview and
  real millimetre dimensions. **Double-click to open the 3D positioning view.**
- **Look and render** — what the product is, material/lighting/background
  presets, and the render controls.
- **Renders** — the results, newest first.

Every card has a **+** menu:

- **Perspective** — Iso / Front / Back / Left / Right / Top. This sets the
  *render* camera, computed offscreen, so you can change the angle without
  opening the 3D view at all.
- **Render** — render now, or inspect the control maps first.
- **This object** — position in 3D, hide from render, duplicate, or jump to
  the Look card.

The 3D view is where placement happens: orbit, a move/rotate/scale gizmo,
front/back/left/right/top/iso framing, and exact numeric transforms. `G`, `R`
and `S` switch gizmo mode; `Esc` closes.

**Scrolling vs zooming.** The wheel zooms the board only over its background. A
panel, popover or toolbar under the cursor keeps the wheel, including at the top
or bottom of its scroll — chaining to a zoom there was jarring. Ctrl/pinch
always zooms. Zoom is exponential in the scroll distance, so trackpads behave.

Capture builds its own offscreen renderer from the camera you framed, so
rendering works from the board without the 3D view being open.

---

## Presets, not prompt engineering

You pick *brushed aluminium*, *dramatic rim*, *marble podium*. Those compose
into a full prompt, with the subject first because early tokens carry the most
weight. Expand "Show the prompt this builds" to see the result, and add your own
words in the free-text field.

Geometry-protection terms are appended server-side and cannot be edited away.

---

## Instagram (last step)

Publishing is built and works, but it is deliberately the end of the pipeline.
See `INSTAGRAM_SETUP.md`. Two things worth knowing up front:

- Instagram fetches media **from its own servers**, so it only accepts a public
  URL. fal.ai results are public CDN URLs and post directly. A local ComfyUI
  result is not reachable and must be re-hosted first — the app detects this and
  says so rather than failing cryptically.
- Reels use the same two-step publish, with the container polled while
  Instagram transcodes.

---

## Development

```bash
npm run dev          # dev server
npm run build        # production build
npx vitest run       # unit tests
npx tsc --noEmit     # typecheck
npx eslint src       # lint
```

Tests cover the pure logic: prompt composition, boundary validation, the
ComfyUI graph wiring, board maths, the model-source allow-list, and the capture
scope rule that keeps editor furniture out of the passes — a regression test for
a real bug where the transform gizmo's axis arrows were being conditioned into
renders.
