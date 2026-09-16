# Running renders on your GTX 1660 Super

Free, unlimited, and fast enough to actually work with. Expected times on your
card, SD 1.5 at 20 steps with both ControlNets active:

| Output | Time per image |
|---|---|
| 512 x 512 | **20–30 s** |
| 512 x 768 | 30–45 s |
| 768 x 768 | 50–90 s |

For comparison, this machine's CPU would take 20–45 **minutes**.

**Run everything on the PC with the 1660 Super** — both ComfyUI and this app.
That is by far the simplest setup: no networking, no firewall rules, no IP to
chase. `COMFYUI_URL` stays `http://localhost:8188` and just works.

Steps 4 (firewall) and the `--listen` flag are only needed if you insist on
running the app on a *different* machine from ComfyUI.

**Total download: 3.58 GB of models, plus ComfyUI itself.**

---

## 1. Install ComfyUI

Grab the Windows portable build from the
[ComfyUI releases page](https://github.com/comfyanonymous/ComfyUI/releases) —
the file named `ComfyUI_windows_portable_nvidia.7z`. Extract it anywhere, e.g.
`C:\ComfyUI_windows_portable`.

No Python setup needed; the portable build bundles its own.

## 2. Download the three model files

A 6 GB card is happiest with **SD 1.5**, not SDXL. These three files are the
whole set. Open PowerShell in the extracted folder and run:

```powershell
cd ComfyUI\models\checkpoints
curl.exe -L -O https://huggingface.co/Comfy-Org/stable-diffusion-v1-5-archive/resolve/main/v1-5-pruned-emaonly-fp16.safetensors

cd ..\controlnet
curl.exe -L -O https://huggingface.co/comfyanonymous/ControlNet-v1-1_fp16_safetensors/resolve/main/control_v11f1p_sd15_depth_fp16.safetensors
curl.exe -L -O https://huggingface.co/comfyanonymous/ControlNet-v1-1_fp16_safetensors/resolve/main/control_v11p_sd15_canny_fp16.safetensors
```

| File | Size | Goes in |
|---|---|---|
| `v1-5-pruned-emaonly-fp16.safetensors` | 2.13 GB | `models/checkpoints/` |
| `control_v11f1p_sd15_depth_fp16.safetensors` | 0.72 GB | `models/controlnet/` |
| `control_v11p_sd15_canny_fp16.safetensors` | 0.72 GB | `models/controlnet/` |

All three were checked live: they return HTTP 200 to an anonymous request, need
no login or licence click-through, and download with exactly these filenames —
no renaming.

> **The `-L` matters.** HuggingFace serves these through a redirect. A plain
> `curl -O` silently saves a ~1 KB redirect stub instead of the model, which
> later fails with a confusing safetensors header error.

## 3. Launch it with the right flags

Right-click `run_nvidia_gpu.bat`, Edit, and save a copy as
`run_nvidia_gpu_lan.bat` containing:

```bat
.\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build --port 8188 --fp16-unet --fp32-vae --reserve-vram 0.5 --preview-method none
```

- **`--port 8188`** — matches what the app expects.
- **`--listen 0.0.0.0`** — **only if** the app runs on a different machine.
  ComfyUI binds to loopback by default, so without it another PC gets
  connection-refused. Running both on this PC? Leave it off; it is one less
  thing exposed on your network.
- **`--fp16-unet`** — the flag that makes two ControlNets fit. See below.
- **`--fp32-vae`** — already the default on your card; set explicitly so no node
  or model config can sneak a fp16 VAE back in.
- **`--reserve-vram 0.5`** — trims Windows' 600 MB reservation. Raise it to
  1.0–1.5 if the desktop stutters or the driver resets.
- **`--preview-method none`** — latent previews have been implicated in
  intermittent black frames on this card.

Do **not** add `--enable-cors-header`. It isn't needed here (the app calls
ComfyUI server-to-server, where CORS doesn't apply) and it replaces ComfyUI's
CSRF guard with a wildcard.

### About the GTX 16-series fp16 defect

Your card (TU116) replaces Turing's tensor cores with FP16 cores that misbehave:
activations overflow to NaN and you get an all-black or all-green image, usually
with no error. It's a hardware fault, not a VAE range problem.

**ComfyUI already handles it.** `comfy/model_management.py` hard-blacklists these
GPUs in `should_use_fp16()`:

```python
# FP16 is just broken on these cards
nvidia_16_series = ["1660", "1650", "1630", "T500", ...]
```

So compute is fp32 by default and you need **no** flag to avoid black images.
Black images on this card mean something *forced* fp16 back on.

**Never use `--force-fp16` or `--fp16-vae`.** Those are the cause, not the cure.

**`--force-fp32` is also the wrong tool**, even though it "works". It makes
weights fp32 too, and the VRAM stops adding up:

| | UNet | 2 ControlNets | VAE | Total |
|---|---|---|---|---|
| Default (fp32 weights) | 3.44 GB | 1.45 GB | 0.32 GB | **5.2 GB** — over budget, streams every step |
| With `--fp16-unet` | 1.72 GB | 1.45 GB | 0.32 GB | **3.5 GB** — fits entirely |

`--fp16-unet` changes only *storage*; compute stays fp32 because the blacklist
still returns false. That one flag is the difference between two ControlNets
being comfortable and thrashing over PCIe. Your text encoder runs on the CPU
automatically on this card, costing no VRAM at all.

## 4. Open the firewall — only for a split setup

**Skip this if the app runs on the same PC as ComfyUI.**

In an **admin** PowerShell on the ComfyUI PC:

```powershell
New-NetFirewallRule -DisplayName "ComfyUI 8188 (LAN)" -Direction Inbound `
  -Action Allow -Protocol TCP -LocalPort 8188 `
  -Profile Private,Domain -RemoteAddress LocalSubnet
```

If your network is set to *Public*, the rule won't apply. Check with
`Get-NetConnectionProfile` and either switch it to Private or use `-Profile Any`.

## 5. Get the app running on that PC

```bash
git clone <your-repo-url>
cd <repo-folder>
npm install          # also fetches the STEP importer into public/occt
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

`.env.example` already has the right values — `COMFYUI_URL=http://localhost:8188`
and the three SD 1.5 filenames:

```bash
COMFYUI_CHECKPOINT=v1-5-pruned-emaonly-fp16.safetensors
COMFYUI_CONTROLNET=control_v11f1p_sd15_depth_fp16.safetensors
COMFYUI_CONTROLNET_CANNY=control_v11p_sd15_canny_fp16.safetensors
```

If you do split the app and ComfyUI across two machines, set
`COMFYUI_URL=http://<comfyui-pc-ip>:8188` instead, and give that PC a static IP
or DHCP reservation — a lease change would silently break the URL later.

**`.env.local` is read at server start**, so restart `npm run dev` after any
change to it, or it will look like nothing happened.

## 6. Set the resolution to 512

In the Look card, set **Resolution → 512**. SD 1.5 is trained at 512px; pushing
it to 1024 is both slower and worse. 768 is a reasonable step up if you have the
patience.

## 7. Check it worked

The top bar pill goes **green** when the server answers *and* all three model
names match. If it stays red, the message tells you which half is wrong:

- *"No ComfyUI server answering at…"* → URL, port, firewall or `--listen`
- *"ComfyUI is running but is missing checkpoint …"* → a filename mismatch

To check by hand:

```bash
curl http://localhost:8188/system_stats
```

---

## If something goes wrong

| Symptom | Cause |
|---|---|
| All-black or all-green renders | Something forced fp16 — check for `--force-fp16` or `--fp16-vae` in your launcher or a custom node |
| Connection refused | `--listen 0.0.0.0` missing, or the firewall rule |
| Red pill naming a missing model | Filename mismatch, or a `curl` without `-L` |
| Every step is slow, disk/PCIe busy | `--fp16-unet` missing, so weights don't fit and stream each step |
| Out of memory | Resolution too high for 6 GB — drop to 512 |
| "OOM with 800 MB free" | Allocator fragmentation — set `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True` |
| Worked yesterday, not today | The PC's DHCP lease changed its IP |

## Why not SDXL

The arithmetic rules it out. SDXL's UNet is 5.14 GB and each full SDXL
ControlNet is 2.51 GB — **10.16 GB of weights against a 6 GB card**. ComfyUI
will partial-load rather than hard-fail, so it completes, but at **6–15 minutes
per image** it isn't a workflow. That is 20–30x worse than SD 1.5 at 512px for
no gain at this VRAM budget.

The geometry lock — depth, normal and the CAD edge pass — works identically on
SD 1.5. You lose some material realism, **not dimensional accuracy**, which is
the part that matters for a product render.

Want more resolution? Generate at 512–640 and upscale by 1.5–2x at denoise
0.35–0.5. That is both faster and better-looking than a native 1024 render on
this card. If you eventually want true SDXL quality, rent a 24 GB pod for an
hour rather than fighting the 1660.
