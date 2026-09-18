# CURRENT_STATE.md — engineering state of `apps/ip`

Written 2026-09-17, immediately before compaction. Status tags are used
strictly: **DISCUSSED**, **PROPOSED**, **APPROVED**, **IMPLEMENTING**,
**COMPLETE**, **REJECTED**, **BLOCKED**.

Approval boundaries live in `APPROVAL_STATE.md` and that file wins.

---

## Recovery

| | |
|---|---|
| **Repo** | `C:\Users\you\Downloads\scratch-repo\webapps` |
| **Branch** | `master` |
| **HEAD, pass two** | `4cd70ce` — *"ip: groundwork for earned lenses - INERT, half a feature"*, 2026-09-18. Tree clean. |
| **Snapshot, pass two** | `ip-preservation-snapshot-20260918.tar.gz`, sha256 `9f9ad051…` |
| **HEAD at pass one** | `222f56e0c140130fa469304d8bfcad771519abe0` — *"ip: a self-contained handoff — the pieces, for whoever tells the story"* (2026-09-15) |
| **Golden recovery identifier** | `ip-preservation-snapshot-20260917.tar.gz`, sha256 `986fd788f3c75600e13b4022fdc14942b873b59bc1da2d1f24d4857e5de485cf`, in `scratch-repo/` (the repo's parent) |
| **Working tree committed?** | **YES** — `3d35fca`, *"ip: preserve the working state before compaction"*, 2026-09-16. **Not pushed.** |

**All of `apps/ip/` is now tracked**, as of `3d35fca`. Git is a real recovery
point; the snapshot above is no longer the only one. Nothing has been pushed.

---

## Current objective — 2026-09-18

**BLOCKED, awaiting the owner.** Preservation pass two is running; no product
work until they respond.

The objective before it stopped: **make exploring feel directed.** The owner,
after several days of actually wandering the live app, reported that it feels
undirected and that arriving produces nothing. Of four offered diagnoses they
confirmed three - *I don't know where to go*, *I go and then nothing
happens*, *it's beautiful but it isn't a game* - and the fourth was false
only because the first is true.

### The evidence gathered, which is better than the theory

Measured against the live site, 2026-09-18:

```
axis 0.00 - 0.50   sightlines HIDDEN          <- home and the block view
axis 0.75 - 2.00   "Root server K · the oldest here, 1993"
axis 2.25 - 2.50   "Root server E · the oldest here, 1983 · 512 in a row..."
```

- There is **no direction at all for the first quarter of the axis**, which
  is the first minute of every visit.
- Across eight axis positions the sightlines produce **essentially one
  repeated suggestion.**
- The owner could name two destinations: *private IP space* and *the brighter
  orbs*. **That is the complete visual vocabulary the map has** - every cell
  is the same dot and only brightness varies.

### PROPOSED, NOT APPROVED — the direction out

**The map should show territories.** Adjacent cells differing in registry or
country are a border; the border is in the data; hairlines are already a
permitted material. It would turn a uniform dot field into a map with shapes
at every scale. Two smaller fixes follow it: sightlines present from the
first frame, and sightlines that vary.

The owner was asked whether they wanted a sketch before it lands in the app.
**They have not answered. It is not approved.**

### Acceptance criteria

Someone who has never seen it can say what they want to go and look at,
within the first minute, without reading any text.

---

## Superseded objective

**COMPLETE — phase B of `docs/ip-plan-v2.md`**, "the descent becomes
sublime". All five items built and deployed except the sound, which is built
and not yet deployed. The exit criterion — *someone pulls back through three
rungs and says something out loud* — has **NOT been judged by the owner**.

Done in phase B:
- **COMPLETE** — one global Hilbert curve for every rung, replacing the
  per-container curve. Rungs now register.
- **COMPLETE** — `ZOOM = FIELD`.
- **COMPLETE** — the convergence pan reworked as a rigid translation.

Also done in phase B:
- **COMPLETE** — the container you came out of stays outlined as it shrinks.
  A rung outlines the container of the rung one finer; registration makes
  that the same rectangle on screen as the finer rung's own boundary, so the
  handoff needs nothing. Verified at ratio 1.000000 across 61 samples and
  every ladder-adjacent pair in both families.
- **COMPLETE, with a correction to the plan** — the descent accumulates, on
  the **rail**, not in the field. Each rung is 64x the last, so the second
  container in is 1/4096th of the frame and the third is under a pixel:
  "at rung eight the seven above are still on screen" was never achievable
  in the field and is exactly true of the rail.
- **COMPLETE, NOT DEPLOYED** — the descent tone. WebAudio, synthesised, four
  octaves driven by `layerAlpha` — the same weights the picture is drawn
  from. Off until asked, remembered in `localStorage`, silent at rest.

### Acceptance criteria for phase B (from the plan)

> Someone pulls back through three rungs and says something out loud.

Concretely: a deeper rung's field is exactly the extent of the corresponding
cells of the shallower one; the previous container stays visible as it
shrinks; passed containers leave nested outlines.

---

## Completed work since preservation pass one — all COMPLETE and DEPLOYED

- **Phase B finished** — the container you came out of stays outlined
  (verified ratio 1.000000 across 61 samples, both families); the descent
  accumulates **on the rail**, because each rung is 64x the last and the
  field can never show more than about two levels; the descent tone, which
  plays `layerAlpha` — the same array the picture is drawn from.
- **Phase C except the tracker** — the notebook, its metrics, the places
  themselves, and **the celebration**: the mark ignites, a pool catches it,
  a ring runs out, a hard line of type, a strike on the visitor's own note.
  It fires **only for a named place never recorded before**.
- **Phase D, the writing** — 126 guide lines across 42 buckets, plus 9
  chains and 29 beats. Loaded, picked and spoken by code that names none of
  them.
- **The guide machinery** — content loader, line picker honouring
  `only[]`/`when`/no-repeat, and the delivery scheduler: silence while
  travelling, ordinary lines about once a minute, named places interrupting,
  a mute that persists and never silences the plate.
- **The sightline engine** — "from here you can see", offering named
  reachable things computed from shipped data, never offering somewhere
  already visited. **Built to fix beat one; measured afterwards and it does
  not.**
- **Landmarks as territory** — pools for single cells, hairline rims for
  regions, asserted rectangular rather than trusted.
- **Bugs fixed:** the highlight orb sitting half a cell from the pointer
  (third half-cell error in this file); a rung that has shrunk now emits less
  light, via a separate `layerLight` array because weight and emission are
  different numbers; the slash-less URL redirect in hosting, which broke all
  four apps.

## Completed work (pass one)

- **COMPLETE** — phases 1, 2, 3, 3b, 4 (travel), 4.5 step 1 (the ladder).
  **Deployed.**
- **COMPLETE** — phase A, "the map stops being empty". **Deployed** —
  verified 2026-09-16 by sha256: `index.html`, `ip.css` and `ip.js` are
  byte-identical live and local, so the query layer is live too.
  - `scripts/ip-build-space-field.py` → `apps/ip/data/space.bin`, 438,937
    bytes gzipped, round-trip verified.
  - Registry loads deferred, parses in **139 ms** (171,333 IPv4 ranges,
    69,327 IPv6, 6,285 keys).
  - Era as brightness; `regLine()` always sizes the year against the whole;
    `fieldMix()` makes the descent sayable.
  - Queries: touch a country code or registry name in the plate. Verified
    for US/BR/SE/IS/VA/AFRINIC/RIPE NCC.
- **COMPLETE, deployed** — the renderer-failure fix (see "Known bugs, fixed").
- **COMPLETE, NOT DEPLOYED** — phase C's celebration, and the machinery under
  it. The content files are loaded and read for the first time: a picker that
  honours only[]/when/no-repeat, and a delivery scheduler — silence while
  travelling, ordinary lines about once a minute, named places interrupting,
  a persistent mute that never silences the plate. The celebration itself is
  the mark igniting, a pool the floor catches, a ring running out, a hard
  line of type and a strike on the visitor's own note. **It fires only for a
  named place never recorded before**, which is narrow on purpose.
- **COMPLETE** — `docs/ip-plan-v2.md`, the full revised plan.

## Work in progress

- **IMPLEMENTING** — phase B, as above.

## Not started

- **APPROVED, NOT STARTED** — phase B's outlines and accumulation.
- **PROPOSED** — phases C–I of `docs/ip-plan-v2.md`: the notebook and
  celebrations, writing the guide, the main line, side lines/gates/eggs, the
  card, the inward half, the ghost tier.
- **PROPOSED** — sound, distributed across phases; the Shepard-tone descent.
- **PROPOSED** — "the doors": NAT64 / IPv4-mapped / 6to4 / Teredo as the
  IPv4↔IPv6 easter egg. Arithmetic verified (`193.0.6.139` →
  `64:ff9b::c100:68b`).

---

## Known bugs

### Open

- **OPEN, found 2026-09-18 during preservation, NOT FIXED** — three landmark
  guide lines reproduce the `w:` note already in the `MARKS` array in
  `ip.js`: `169.254.0.0/16`, `64:ff9b::/96`, `fe80::/10`. Duplication between
  code and content, and a visitor on one of those three can be told the same
  sentence twice — once by the plate, once by the guide. Deliberately left
  alone: a preservation pass must not change production behaviour. The fix is
  three rewritten lines plus a linter check comparing content against MARKS.
  See `PRODUCT_SOUL_EVALS.md` T22, which is **failing**.
- **OPEN, the largest one** — exploration has no direction. Measured, not
  guessed: sightlines hidden for the first quarter of the axis, one repeated
  suggestion across eight positions, and a map whose whole destination
  vocabulary is brightness. See T27.

- **FIXED 2026-09-17, NOT DEPLOYED** — the highlight orb sat near the pointer
  but never under it. `cursorAt` subtracted half a cell when inverting the
  ray, which does not undo the half-cell that puts a mark at its cell's
  CENTRE — it shifts the whole pick grid against the marks, so a mark landed
  on a cell boundary and the highlight drew half a cell up and left. Half a
  cell is ~1px at a 480px window and ~14px at 1800px, which is why it was
  invisible here and obvious to the owner. **Third half-cell error in this
  file, all the same shape: one place treats a cell as a point, another as
  an area.** `__ip.cur()` now probes orb-against-mark so the next one is
  caught by measurement rather than by eye.
- **FIXED 2026-09-17, NOT DEPLOYED** — two contributing causes found with it:
  the aim's pick radius is two whole cells, and the 30px floor under it is a
  thumb, not a mouse. The cell the field resolves now wins over a target's
  radius, and the floor is 11px on devices that can hover.

- **FIXED IN SOURCE, NOT DEPLOYED** — the slash-less URL. `/ip` (no trailing
  slash) served `/ip/index.html` at 200 with no redirect, so the browser's
  base URL stayed `/ip` and every document-relative asset resolved to the
  root and 404'd: no stylesheet, no script, **no address**. It broke all four
  apps and looked identical on desktop. `IndexRewrite` in
  `hosting/hosting_stack/hosting_stack.py` now returns a 301 to the canonical
  URL, carrying the query string over. **Needs `deploy-hosting.ps1`, which is
  human-run.**

- **OPEN, deliberate** — mobile. The exploration model assumes hover, which
  phones do not have. Pinch is not implemented despite `apps/ip/README.md`
  claiming wheel/drag/pinch. Owner's decision: **not a first-class target
  yet.** Caveat recorded: the share path (phase G) is mobile.
- **FIXED 2026-09-17, NOT DEPLOYED** — a rung rendering as a white slab. A
  rung draws 4,096 marks whatever size it is on screen, so pulled a fraction
  of a step past one, the same marks went through a quarter of the pixels and
  merged into a solid slab over the middle of the field — exactly where phase
  B draws the container you came out of. Fixed by an absolute concentration
  fade applied AFTER the weights are normalised, and by splitting `layerLight`
  (what a layer emits) from `layerAlpha` (what it weighs, for the plate, the
  pointer and the sound). Two earlier attempts failed: a pre-normalisation
  fade is divided back out, and fading `layerAlpha` itself drops a rung below
  `LIVE` and hands the plate to the block.
- **OPEN, cosmetic** — the whole-IPv4 view still renders hot at the top of the
  rail. Untouched by the above: a rung sitting on its own axis has a fade of
  exactly 1. This is density rather than shrinkage — the 4,096 marks are
  genuinely bright — and is the `spread()` case, which `buildSpace` does not
  yet use.
- **OPEN, cosmetic** — the block renders hot at some scales. `spread()` and a
  shrink fade have reduced it; it is not fully solved.
- **OPEN, unquantified** — cross-fade residual. Adjacent rungs agreed to 1px
  in one measurement; a rung two steps away was further off. Registration is
  geometrically exact, so the residual is believed to be the sub-cell
  reference frame, **NOT VERIFIED**.
- **UNEXPLAINED, not reproducible** — during one batched check the aim jumped
  to an address nobody had chosen. Could not be reproduced. The owner was
  interacting with the same live page at the time and that is the most likely
  explanation.

### Fixed this session, worth not regressing

- The Canvas 2D fallback **never worked in the wild**: a canvas can only have
  one context type, so after `makeGL` took a WebGL2 context and failed, the
  2D path could not have the canvas back. Falling back now replaces the
  canvas element. This was the phone's black screen.
- `loadAddress()` moved above the renderer — nothing optional in front of the
  address.
- `var ZOOM = FIELD;` written above `var FIELD = 64;` — `var` hoists the
  declaration, not the value, so every scale became NaN and the frame went
  blank with nothing in the console.
- `var aimX = mx` read before `mx` existed. Same blank frame.
- A half-cell offset in the reference frame, magnified 64× per level.
- `rungPlate` read the field mix before computing it.
- Plate text went stale mid-travel; `setAxis` now syncs the DOM itself.
- `tidyHolder` left an orphan dash on `"AS8151 - UNINET"`.

## Failing tests

**None — there is no automated test suite.** Verification in this project is
`node --check`, `python -m py_compile`, and driving the live app in the
browser pane. See `PRODUCT_SOUL_EVALS.md`.

---

## Unresolved questions

1. Whether phase A alone is enough before committing to B–I. **The plan says
   build A and stop; A is built and partly deployed; this has not been
   judged.**
2. How to show era and country without breaking the three-colour rule.
   Currently brightness only; country is not drawn at all, only said.
3. Whether the guide's voice survives forty repetitions. A writing problem,
   unknowable until about the tenth line.
4. Whether the ghost tier stays scoped to deep rungs.
5. Mobile: what it should be, and when.

---

## Architecture decisions

- **Raw WebGL2, no library**, GLSL as template strings; Canvas 2D fallback.
- **Single file, no build step.** ES5 `var` style deliberately — no
  transpiler, no bundler, no dependencies.
- **BigInt for all address arithmetic.** Never a float.
- **One global Hilbert curve**, not one per rung.
- **Deferred data**: nothing but our own edge is contacted until the visitor
  moves off Home.
- **`localStorage` only.** No server, no accounts.
- **CloudFront Function at viewer-request** for `/ip/whoami`.

## Rejected technical approaches, and why

- **Canvas 2D as primary** — 1px line cap, no affordable bloom.
  `docs/ip-render-research.md`.
- **`ZOOM = 64` without repositioning** — measured: 23px of disagreement
  became 147px. Scaling an unregistered offset magnifies it.
- **Four "cleverer" encodings of `space.bin`** — frequency-ordered keys,
  grouped keys, delta payloads. All lost to the naive one; gzip's dictionary
  already beats a hand-rolled scheme. Numbers in the script's docstring.
- **Coarser year buckets** in `space.bin` — 343 KB for five named eras vs
  438,937 for exact years. Exact kept.
- **Droste / complex-log self-similarity** — fabricates detail that is not
  there.
- **A truly endless recycled axis** — the subject stops being a map of a
  finite thing.
- **Anchoring the rung lattice on the announced block** — gives rungs that
  straddle `/64` and never frame it. Pinned to `/64` (v6) and `/24` (v4).
- **Leaderboards** — architectural, not taste: there is no server.

---

## Important modified/created files

**Untracked, the entire app:** `apps/ip/index.html`, `ip.css`, `ip.js`,
`telemetry.js`, `data/space.bin`, `fonts/`.

**Untracked, new:** `docs/ip-plan-v2.md`, `docs/ip-infinity-research.md`,
`docs/ip-render-research.md`, `docs/ip-narrative-and-outline.md`,
`docs/ip-art-direction-rejected-seafire-cordage.md`,
`scripts/ip-build-space-field.py`, `scripts/ip-build-asn-field.py`,
`scripts/ip-render-gate.html`, `hosting/edge/ip-whoami.js`.

**Modified, tracked:** `PROJECT_STATE.md`, `apps/ip/README.md`,
`docs/ip-build-plan.md`, `docs/ip-art-direction.md`,
`docs/building-a-new-app.md`, `hosting/hosting_stack/hosting_stack.py`,
`hosting/site-root/index.html`, `scripts/deploy-hosting.ps1`, `.gitignore`.

**Deleted, tracked:** `apps/ip/lib/dyes.js`, `apps/ip/lib/form.js`,
`scripts/ip-contact-sheet.html`, `scripts/ip-play.html` — all from the
rejected Cordage direction.

---

## Commands

```bash
node --check apps/ip/ip.js                     # the only JS check there is
python -m py_compile hosting/hosting_stack/hosting_stack.py
python scripts/ip-build-space-field.py          # rebuild space.bin
```

```powershell
# DEPLOY IS HUMAN-RUN. Claude never runs these.
$env:AWS_PROFILE = 'story-deploy'
.\scripts\deploy-app.ps1 -Name ip               # app only
.\scripts\deploy-hosting.ps1 -AlertEmail <addr> # only if hosting/ changed
```

```bash
curl https://<DISTRIBUTION_DOMAIN>/ip/whoami   # expect text/plain address
```

Local preview: `.claude/launch.json` config **`webapps`**, port 8766, served
from the repo root. The app is at `/apps/ip/`. Force the fallback with
`?renderer=2d`; drive a fixture address with `?ip=<address>`.

Debug surface, in-page: `window.__ip` — `renderer()`, `axis(v)`, `net()`,
`aim()`, `subject()`, `travel(t)`, `step(n)`, `back()`, `home()`, `trail()`,
`probe()`, `lay()`, `query(q)`, `reg(t)`, `regState()`.

## Background tasks

None running. One completed during the session (`bqpxuqwsb`, an early
packing-variant measurement); its result is obsolete and superseded by the
numbers in `scripts/ip-build-space-field.py`.

---

## Immediate next 3–5 actions

**Ordering now lives in [`docs/ip-build-plan-v3.md`](docs/ip-build-plan-v3.md).**
Short version: the chain engine, then the doors, then the card, then the
inward half, then the ghost tier - and an hour of somebody actually wandering
is worth more than any of them.

1. **Deploy the slash-less URL fix** — `deploy-hosting.ps1`, human-run. Until
   it ships, `/ip` without the trailing slash shows no address.
2. **Finish phase B**: the previous container outlined as it shrinks, and the
   nested accumulation.
3. **Judge whether phase A was enough** before committing to C–I.
4. Phase C, or phase D's writing, per `APPROVAL_STATE.md`.
