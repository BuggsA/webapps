# ip — build plan

> **SUPERSEDED FROM PHASE 5 ONWARD by [`ip-plan-v2.md`](ip-plan-v2.md)**
> (2026-09-17). This document remains the record of how phases 1 to 4.5
> were built and why, and its standing rules still hold. It is no longer
> a description of what happens next.

**Supersedes the phase list written for Cordage.** Phase 1 of that plan (the
generator gate) is void: the generator it gated no longer exists. This plan
implements `ip-narrative-and-outline.md` (the human's narrative + outline
brief) in the visual language locked in `ip-art-direction.md` ("Survey").

The brief's own build sequence is Prototypes A–F. This plan is that sequence,
with the repo's phase-per-commit discipline: each phase lands something you
can open and look at, and stops there.

---

**Phases 1-3 are built. Phase 4 is next.** A full end-to-end spike of
every phase was built on 2026-09-15 and deliberately rolled back to phase 1:
it worked, but it was made in one pass with no gate between phases, and the
craft showed it. The spike is archived outside the repo. What survived it is
worth more than the code did — the live data checks, the failure modes, and
the seven open decisions now collected at the bottom of
`ip-art-direction.md`.

**Working rule from here: one phase, then stop and show it.** Design rules
that the stills and the brief do not settle get proposed, not written in.

**Revised 2026-09-15, later:** a seventh phase was inserted, not appended.
The render research established that the renderer is the foundation under
every other phase rather than a polish pass at the end, so it is phase 2 and
everything after it shifted by one.

## Decisions taken (the brief's §14 table)

The two below are engineering, and are settled. Everything else the brief
left open is a design call and now lives in `ip-art-direction.md` under
"Open" — including the physical form of the scale axis, which is phase 3's
first question and not phase 1's.

| Brief's open decision | Resolution | Why |
|---|---|---|
| **First-response edge pattern** | CloudFront Function at viewer-request on `/ip/whoami`: `text/plain` body for non-HTML clients, JSON for the page. The art page stays a static object in S3. | `ip-data-research.md` §4A. The 10 KB function quota rules out generating the whole page at the edge; a Lambda puts a cold-start tail on the one thing that must never feel slow. Cost: in a browser the number needs one same-origin fetch to the nearest edge. |

## The thing that must not get squeezed out

Written down 2026-09-16, after the owner flagged it mid-build:

> *"I mentioned the last point so they can wander. It seems like that aspect
> is kind of getting removed from this. Please remember they should wonder
> and be able to wander and explore."*

Fair warning, and correct: several rounds in a row went entirely into the
renderer, and the renderer is only the surface the wandering happens on. The
load-bearing mechanic of this whole product is **recursive, chosen movement
through real named networks** — not a prettier picture of one.

So, as standing rules for every phase from here:

- **The axis is held, not stepped.** Direct manipulation is what makes scale
  feel like something in your hand. Snapping to states takes the object back
  out of the visitor's hand at the end of every gesture. Phase 3 ships the
  axis free and continuous; if that turns out wrong it gets changed on
  evidence, not on tidiness.
- **Anything real on screen can be touched, and touching it does something.**
- **The axis never stops because the data ran out.** The owner's call on open
  decision 5: an address with no announced prefix can still travel outward,
  with nothing marked as theirs and the reason said plainly. Wandering is not
  a reward for having good routing data.
- **No phase is "done" if it made the space smaller.**

## Phases

Each phase ends with something you can open and look at, `node --check`
passing, and a commit that references `ip-art-direction.md`.
**One phase, then stop and show it.**

### Phase 1 — The answer, and the floor it stands on — **DONE, in part**

What is built and does **not** depend on the renderer, so none of it is
thrown away by phase 2:

- `apps/ip/index.html`, `ip.css`, `ip.js`; Archivo self-hosted; data-URI favicon.
- The address as a real DOM element, first in focus order, with `Copy`, sized
  from its own character count so the longest IPv6 and the longest IPv4 both fit.
- IP acquisition: same-origin `whoami` → `?ip=` fixture → an honest
  unavailable state. **No third-party echo, ever.**
- `hosting/edge/ip-whoami.js` + the `/ip/whoami` behaviour in `HostingStack`.
- Reduced motion, 320 px, keyboard, focus states, offline shell.

What is built and **is** superseded by phase 2: the Canvas 2D chassis
drawing. It becomes the fallback renderer rather than the primary one.

- **Not yet verified:** the edge function has never run. It needs a
  `cdk deploy` of `WebappsHostingStack`. Until then the page shows its honest
  unavailable state and `?ip=` drives every other check.

### Phase 2 — The renderer — **BUILT**

This phase did not exist when this plan was written. It exists because the
phase-1 picture was flat, and the diagnosis in `ip-render-research.md` is that
Canvas 2D cannot carry the light the reference stills have. It is the
foundation under every later phase, so it comes before all of them.

Port the pipeline proved in `../scripts/ip-render-gate.html` into `apps/ip/`:

- WebGL2, raw, no library. Primitives: feathered depth-aware lines, tight
  round points, rimmed surfaces, ground light pools.
- The glossy floor: planar reflection by mirroring about y=0, faded and
  smeared by height above the plane.
- HDR accumulation, bright pass with a soft knee, 5-level bloom chain, ACES
  tone map, vignette, multiplied grain.
- Pointer picking: measured projected radius, with hysteresis.
- Pointer parallax on the camera.
- **Canvas 2D becomes the fallback** for the ~2% without WebGL2 — the phase-1
  renderer, kept and switched to when `getContext('webgl2')` returns null.

Constants are not to be re-derived: the gate has the tuned values and
`ip-render-research.md` records why each one is what it is.

- **Exit:** Home in the app is indistinguishable from the gate, the fallback
  path still draws a correct Home, and the address is still in the first paint
  on both.
- **Unblocked 2026-09-16.** The owner amended the brief's §7 and
  `building-a-new-app.md` §1. WebGL2 primary, Canvas 2D fallback.

### Phase 3 — The first true revelation (brief's Prototype B) — **BUILT**

*Decisions 1, 2 and 5 were answered by the owner on 2026-09-16. 1 and 2 went
the way they were proposed; **5 did not** — the owner chose "let them travel
anyway" over "stop at the block", because wandering is not a reward for
having good routing data. Recorded as theirs.*
- O1: the announced prefix as a lattice; the visitor's address as one lit mark
  at its real index; origin ASN and holder name.
- RIPEstat `network-info` + `as-overview`, deferred until the visitor moves,
  cached in `localStorage`.
- Hover names the block; the address mark is the one amber thing in frame.
- Loading and unavailable states that are composed, not spinners.
- **Exit:** a visitor can repeat one new true fact.

### Phase 3b — The address space — **BUILT**

*Added 2026-09-16 at the owner's request, and it reverses their own brief's
§17, which had replaced an address-space ladder with the network ladder. The
argument for putting it back: address space is free (pure arithmetic, no
lookup), it gives IPv6 equal standing, and it turns into the wandering the
product is actually for — **space is the map; networks are what you find in
it.** Flagged before building, chosen by the owner.*

- **The space around your block** (axis 2): a 64x64 Hilbert field of the
  containing block, 4,096 blocks the size of yours, one of them lit.
- **The whole space** (axis 3): all of IPv4, or `2000::/3` for an IPv6
  visitor, as 4,096 blocks with yours marked.
- Every cell is named by arithmetic on the visitor's own number. **No lookup
  is made here and none is implied** — which is the point of the note.
- **The epistemic line, stated quietly** (the owner's ask: a disclaimer that
  is not too loud). Lit means known. Dark means space nobody has asked about.
  Hovering an unknown cell says "not asked" under its name.
- **IPv6 as a first-class place**, with the size gap said plainly: one
  ordinary /64 holds about four billion times the whole of IPv4.

### Phase 4 — The map begins (Prototype C) — **TRAVEL BUILT 2026-09-16**

Brought forward and built after the owner said the app still read as a slide
deck: *"almost like the universe where you could expore a gyser on mars or
check out the milkyway then visit the largest crater on europa. Not a one way
slide, but exploration."* Correct, and the cause was structural: one axis
anchored to the visitor's own address is a slider however many rungs it has.

- **Selection re-points the instrument** — DONE, and it is one substitution.
  Everything is built around `S.aim` rather than around home. Choosing a
  block GOES there; the ladder re-anchors to it; home becomes a stated
  distance away and is simply absent from the frame when it is not in the
  container. Amber is only ever you.
- `Back` retraces a trail, `Home` returns — DONE.
- Lateral travel by drag and by arrow keys, walking the aim along the address
  line so container boundaries are crossed rather than hit — DONE.
  **A wall is what makes a thing a slide deck.**
- Still open: **O2** the network's other announced blocks, **O3** observed
  neighbours, and free spatial panning (an unbounded Hilbert window, which
  needs a BigInt Hilbert transform; deferred on purpose until the travel
  model had been looked at).
- **Exit:** a visitor can enter another real network and come back without
  being told how. **Met.**

*Open decisions 6 and 7 land here. 7 — the physical form of the axis — is the
one the brief asks to be prototyped three ways, and the gate has now added
evidence: direct manipulation is what makes scale feel held, so the current
snap-to-state behaviour is on trial.*
### Phase 4.5 — The deep space, and what may be drawn in it

*Inserted 2026-09-16, not appended. Design and measurements:
[`ip-infinity-research.md`](ip-infinity-research.md). It sits here, after the
ladder, because the generated tier needs the ladder's real-network vocabulary
to have something to imitate.*

Owner's ask: *"there could be a infinite appearance thing kind of build in ...
some illustration, simulation, or reconstruction rather than ground truth with
it displayed as not being ground truth ... Almost like no man sky or
minecraft."*

Three decisions taken on the record (owner, 2026-09-16): **per-family rail at
the real bit depth**; **ghost networks only — no invented names, no terrain**;
**ship every registry table that packs small enough**.

The rule that makes the rest safe, from §4 of the research:

> **Real things cast light and have a reflection. Imagined things are line
> drawings that the floor refuses to acknowledge.**

Four grades — measured, answered, derived, imagined — told apart by material,
not by a disclaimer. Steps 1-4 below add no fiction at all.

1. Ring layers + floating origin + per-family `MAX_AXIS` (IPv4 2.67, IPv6
   10.67). **Never convert an absolute address to a float.**
2. Tier 3 small tables inline — IANA /8s, IPv6 unicast (51 rows for the whole
   of `2000::/3`), RFC 6890.
3. Tier 3 full NRO dataset, deferred to the same trigger as the RIPEstat
   lookups. Measured at **291 KB gzipped**; `scripts/ip-build-space-field.py`.
4. Landmarks — **address only, never the label**; the holder is earned by the
   same lookup path as every other block, and if the lookup disagrees the
   lookup wins.
5. Tier 4 ghosts: unlit wireframe, no reflection, seeded by the address,
   shaped by real `ris-asns` distributions.

- **Exit:** an IPv6 visitor can descend four times further than today, the
  space names itself the whole way down, and nothing invented is ever
  mistakable for something observed.

### Phase 5 — The inward boundary (Prototype D)
- I1 what reached the edge, I2 what stayed here, I3 the fingerprint sentence,
  I4 the boundary. Privacy audit, and the copy written *from* the audit.
- **Exit:** the difference between the two strata is understood, and the
  ending informs rather than alarms.

### Phase 6 — The horizon (Prototype E)

*Open decisions 3 and 4 land here. `scripts/ip-build-asn-field.py` already
fetches and packages the population; the layout rule is the undecided part.*
- O4: the Hilbert field from `data/asns.bin`, density-reduced at distance,
  Home and visited subjects marked, the dataset dated on screen.
- The first real performance test of the renderer: 87,000 marks is one draw
  call, but the post chain has to hold on a cheap Android at capped DPR.
- **Exit:** every position explainable, Home findable, fast on the floor.

### Phase 7 — The artifact and the exit (Prototype F)
- Saved image: canonical still + museum plate + trail + redaction default.
  The still is now a render-target read-back rather than a second draw path.
- The series plate, the further-reading exits, the provenance line.
- **Exit:** the PNG is truthful, legible, and gives nothing away unasked.

## What the gate is, and is not

`scripts/ip-render-gate.html` is **dev-only and never synced to production**,
like the contact sheet before it. It is a proof and a reference for the
constants, not a phase. Its scene is documentation-reserved fixtures, not
live data. Nothing in it ships; phase 2 ports the technique, not the file.

## Deploy — read this before phase 1

**This app is the first that needs `hosting/` redeployed, not just an
`s3 sync`.** The CloudFront Function and its cache behaviour are a
`cdk deploy` of `WebappsHostingStack`. Until a human runs it, `/ip/whoami`
404s and the app shows its honest unavailable state — which is a state it has
to have anyway. Nothing about the build is blocked on the deploy, and the
agent never runs it.
