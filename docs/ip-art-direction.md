# ip — art direction

**STATUS: the LOOK is locked. Several RULES are not — see "Open" at the
bottom, and do not treat them as settled.**

"Survey", locked 2026-09-15 by the human's own reference stills, which
arrived with `Whats-My-IP-Narrative-and-Design-Outline.md` (the narrative +
outline brief that supersedes the old parts list). The stills are not mood
this time; they are the direction. Two earlier attempts — **Cordage** (built,
rejected on sight) and **Sea Fire** (proposed, never built) — are archived in
`ip-art-direction-rejected-seafire-cordage.md`.

What is locked below is what the stills decide: the chassis, the three colour
roles, the type, the motion rules and the banned list. What is **not** locked
is the set of layout rules invented to fill the gaps the stills leave — those
are proposals, and they are collected at the end of this file rather than
buried in the tables above, because the last three attempts failed on
decisions that were made quietly.

Narrative + outline: the human's brief. Plan: `ip-build-plan.md`.
Data: `ip-data-research.md`.

---

## Why this direction and not the last two

The last two directions failed the same way in two different costumes.
Cordage was a line drawing you could only look at. Sea Fire was a material
you could touch but that referred to nothing — *sensation with no referent is
a fidget toy.* Both invented a geometry and then hung the data on it.

Survey inverts that. **Every position on screen is computed from a real
number, by a rule that can be stated in one sentence.** The beauty is not
applied afterward; it is what a truthful diagram of this data looks like when
it is drawn carefully, at the right scale, in the dark, with enough space
around it.

The governing sentence from the brief:

> **The geometry must remain accountable to the data.**

That is also the art direction. If a mark's position cannot be explained, it
is removed — not restyled.

## The thesis

**An instrument, not an illustration.**

The page is one surveying instrument with a home position. It has a plate
(the ground), an axis (the plumb line), a reticle (the polar rings at the
origin), and a subject. Moving the scale moves the instrument, not the world.
The subject changes; the chassis never does. That continuity is what makes
nine semantic states read as one place instead of nine screens.

## The chassis — present in every state

Drawn identically at every scale, which is what proves it is one instrument:

1. **The ground plane.** A rectilinear grid receding to a horizon at the
   upper third, under a **polar ring set** centred on the origin: concentric
   rings, dotted, plus a fine tick scale along the horizontal axis. The grid
   is the coordinate system the marks are placed in, so it is never
   decoration — it is why you can see that one slab is further out than
   another.
2. **The plumb axis.** A single vertical hairline through the origin, with a
   small node where the current subject sits on it. This is the scale axis
   made visible: the thing the title refers to is always *on* that line.
3. **The origin.** Home is always at the centre of the rings, at every scale,
   even when it is a single sub-pixel point. You can always find yourself.
4. **Near-black field.** Not pure black: a very dark blue-black so the grid
   can sit *under* it in value without clipping.

## The marks — one vocabulary, four relationships

The brief's four relationships each get a form, and the forms are constructed
from the same two primitives (a lit edge, a dotted interior) so they read as
one family.

| Relationship | Form | What sets its size and position |
|---|---|---|
| **Containment** (O1) | A **lattice**: a rectangular plane of dots in perspective, with lit edges | Dot count from the prefix's host count (capped, then *stated*); your address is one lit dot at its real index within the prefix |
| **Collection** (O2) | Many **slabs** on the plane, each a lattice with thickness | Each slab's area is proportional to the host count on a log scale — a /20 really is visibly bigger than a /24; position is stable, sorted by prefix |
| **Adjacency** (O3) | **Nodes** joined by hairlines | Node size from that AS's announced-prefix count when known; layout is a deterministic radial placement seeded by ASN, not a force sim |
| **Population** (O4) | A **field** of marks to the horizon | Position is the ASN's Hilbert index over the 1024x1024 ASN-number plane (see below) |

Inward gets the same vocabulary turned on its side: **stacked planes** at
different heights on the plumb axis, with risers dropping from each value to
its plane (still 7). Same grid, same lit-edge language, read as strata rather
than distance.

## The horizon rule — PROPOSED, not closed

The brief (§5, "The horizon problem") demanded an answer to:

> **Why is this ASN at this position?**

The answer proposed here, for phase 5, awaiting a decision:

> **Position is the Hilbert curve index of the AS number, over a 1024x1024
> plane covering AS0–AS1048575. Presence means the AS was observed
> originating a route by RIPE RIS on the dataset's date.**

Chosen over the topology-derived and registry-grouped candidates because:

- **It is stated in one sentence and it is stable.** The same AS is in the
  same place on every visit, on every device, forever. You can learn where
  your provider lives.
- **The texture is real.** Hilbert keeps numerically adjacent ASNs spatially
  adjacent, and AS numbers are allocated to registries in contiguous runs, in
  order, over time. So the clumps really are allocation blocks, the voids
  really are unassigned or unannounced ranges, and the density gradient
  really is the history of the number space filling up. None of that was
  designed; it fell out of plotting the truth.
- **It is cheap and it works offline.** A 128 KB bitmap, no per-frame layout,
  no network.

Consequence accepted: the marks at the horizon are **uniform in size**,
because there is no bulk source for per-AS prefix counts that is keyless and
CORS-open. The reference still shows varied slabs out to the horizon; that
variation would have to be invented, so it is cut. Variation returns the
moment you enter a network, where the counts are real. *This is the single
visible deviation from the stills, and it is deliberate.*

## Colour

**FOUR roles as of 2026-09-19** — see the owner's decision below. Derived,
not decorative.

| Role | Value | Meaning — strictly enforced |
|---|---|---|
| **Cream** `#F2EDE3` | display numerals, current subject's name | the thing you are being told |
| **Cold blue-white** `#CFE3FF` to `#5C7FA8` | every structure, every mark, every grid line | data that is not you |
| **Warm amber** `#F5A623` to `#FFD9A0` | Home, the current position, the trail | **you, and only you** |
| **Been** `rgb(1.0, 0.94, 0.82)` linear | a cell this visitor has asked about | **where you have been** |

Amber is the scarcest thing on screen and it never means anything but *you*.
That is what makes finding yourself at the horizon work without a legend.
Uncertainty is not a fourth colour — it is **unresolved structure**: lower
opacity, dotted instead of solid, no endpoint.

### OWNER DECISION, 2026-09-19 — a fourth role for where you have been

The three-role rule was locked. **The owner changed it**, in these words:

> *"the color of visited ips should change. Something that doesn't compete
> with your own ip address. Maybe a cream color."*

Recorded here as their decision, per the standing rule that the app is not
frozen and that an authorized change to a locked section gets written down
with a date.

**Why it was needed.** The map had no memory. `S.trail` is never drawn and
the notebook is never read by the renderer, so nothing a visitor did changed
the picture — three days of wandering left a frame identical to the first.
This table already claimed amber covered "the trail"; it never did.

**Why not amber, and why this is a new role rather than an extension of
cream.** Amber is *you, now*. Spending it on your history would put hundreds
of you on the plate and destroy the scarcity the row above depends on — the
owner's own framing was that it must not compete with your address. It is
not cream either, in the strict sense: cream is *what you are being told*,
and where you have been is a fourth thing — *your own history*, which is
about you without being you.

**Why the value is not `#F2EDE3`.** The CSS cream is very nearly white, and
white is what blown-out looks like in an additive HDR frame with a bloom
chain. The hue is pushed warmer at the source so that it *lands* at cream
on screen after the tone map. It is specified linear, not as a hex, because
it is a renderer colour and never a CSS one.

**It distinguishes by hue, deliberately not by brightness**, because
brightness is already spoken for: it carries allocation age, which reference
state R3 depends on.

### OWNER DECISION, 2026-11-11 — say roughly where the address is, and say what it is

The owner, on the live app: *"I don't think it is very user friendly. Looks
mediocre and doesn't display location like 'xyz Tennessee'."*

Recorded as their decision, per the standing rule that an authorized change
to a locked section is written down with a date.

**What changed.**

1. **A location line under the address**, at home only: *"Near Nashville,
   Tennessee"*, and under it the country and *"Approximate: your network's
   location, as this site's own edge reads it. Not kept."* It comes from the
   CDN that already serves the page (CloudFront's viewer geo headers,
   Cloudflare's `request.cf`), returned by `whoami` alongside the address.
   **No third party is asked**, so the founding rule — the address only from
   our own edge — still holds.
2. **"Your public IP address" is visible** above the number at home. It was
   screen-reader-only, and a bare number in the dark did not say what it was.
3. **The menu is `--cold-3`, not `--cold-4`.** Measured at about 1.8:1
   against the ground it was close to invisible. Same role, readable shade.

**Extended the same day**, after *"it should be useful first before
anything"*: the single location line became a **row of three readings** —
location (approx.), internet provider, address type — each a small
uppercase label over a value, divided by hairlines; a stacked column on a
phone. Under it, **"Explore the internet around this address"**, a text
control with a hairline underline (no pill, no fill, no icon), which steps
the axis out one stop exactly as ArrowDown does — the visitor's press moves
the instrument, nothing moves on its own. The answer now **measures where
the amber mark is drawn and keeps clear of it**, spending the empty sky
first and dropping secondary lines only when there is no sky left.

**What did not change.** *"No geography of any kind"* in **Banned** still
governs the field: nothing is drawn — no map, no pin, no globe. The location
is a line of text. It is always *Near* or *Somewhere in*, because it is where
the network appears to be, not where the person is, and it is never
dramatised (`PRODUCT_SOUL.md` §8.5: no "we know where you are"). It steps
aside with the label when the answer shrinks into the HOME marker.

## Type

**Archivo** (OFL, self-hosted variable, `fonts/`), and nothing else.

- **Numerals**: `wght 250–300`, `wdth 105–112`, generous tracking, large.
  The address is the largest thing that has ever been on screen and it is set
  like a plate on a wall, not like a heading.
- **Secondary**: `wght 400` at 0.55–0.7x the numeral size, in cold blue-white.
- **Section labels** (inward only): `wght 500`, letterspaced `0.18em`,
  uppercase — the one place uppercase is allowed, because those are strata
  labels on a diagram, not headings.
- No serif. (Fraunces carries *tonight* and *tide*; this app is the
  instrument in the series, and it is the one that should not look drawn.)

## Motion

- **Scale is continuous, states are semantic.** Moving the axis dollies the
  whole scene continuously; each state fades in over its own scale window, so
  travel feels like travel, not like a slide change.
- **Nothing animates before the answer is usable.** Still the hardest rule.
- **Motion explains a change of scale or subject. Nothing decorates idle
  time.** No drift, no twinkle, no ambient parallax.
- **Reduced motion is a composed still**, and it is the basis of the saved
  image. State changes are direct; the field does not move on its own; the
  frame at every state must be worth printing.

## Banned

- No globe, no world map, no country, no coastline, no geography of any kind.
- No `border-radius` on anything, no `backdrop-filter`, no `box-shadow`.
- No system-UI, no Inter.
- No filled-pill CTA, no centred card, no icon set, no legend, no modal, no
  tutorial, no onboarding, no consent wall.
- No indigo-to-violet gradient, no glowing blob, no lens flare, no bloom
  applied as a post effect. (Light here is the sum of three stops drawn
  additively — a tight core, a mid falloff, a wide dim halo — never one
  radial gradient.)
- **No animated packet, no fake traceroute, no line described as a cable.**
- No mark whose position cannot be explained in one sentence.
- No exclamation marks. No emoji.
- No uniqueness score, no "1 in N", no privacy scare, no shield icon, no
  green check.

## The floor — the states that must also be beautiful

Checked every phase, in the app and against the fixtures:

- An address with **no** routing data (unannounced / bogon).
- An AS with **1** prefix, and an AS with **thousands**.
- An AS with **no** returned neighbours, and one with ~900 of which most are
  flagged uncertain.
- **IPv6** — a /48 inside a /32 is a very different pair of numbers than a /24
  inside a /8, and the lattice has to survive it.
- 320 px wide. Reduced motion. Offline after first load. The edge function not
  deployed at all.

If any of those is merely *acceptable*, the direction has not passed.

---

# Open — decisions that need a call before the phase that uses them

These came out of building a full spike end to end (archived outside the
repo, not in `apps/ip/`). Each one is a rule I invented to fill a gap the
stills and the brief leave open. They are written down because they work,
not because they are settled.

| # | Decision | The proposal | Needed by | Why it is not obvious |
|---|---|---|---|---|
| 1 | **The origin holds the SUBJECT, not Home** | At every state, the thing being looked at is centred on the origin; the visitor's own mark is amber wherever it falls, plus a persistent HOME marker. | Phase 2 | The alternative — Home always dead centre — is a stronger "you are here", but it throws the composition off-centre whenever the address sits near the edge of its own block. The stills centre the subject. |
| 2 | **IPv6 is measured in /64 subnets** | A /48 reads "65,536 subnets of the usual size (/64)" rather than "1,208,925,819,614,629,174,706,176 addresses". Both are true. | Phase 2 | It quietly changes the unit the whole outward ladder counts in, and a reader who knows IPv6 will notice; a reader who does not would otherwise be shown a 25-digit number that tells them nothing. |
| 3 | **The horizon is a Hilbert field of AS numbers** | Position = the Hilbert index of the AS number over a 1024x1024 plane. See above. | Phase 5 | The brief lists three candidates and asks for a spike of each. This picks one on the argument that it is the only one statable in a sentence. |
| 4 | **Horizon marks are uniform in size** | No bulk keyless source exists for per-AS prefix counts, so the varied slabs in the reference still would have to be invented. Cut. | Phase 5 | It is a visible departure from the human's own picture. |
| 5 | **The outward axis stops where the data stops** | An address in no announced prefix can travel to +1 and no further; an address we never learned cannot travel outward at all. | Phase 2 | It is honest, and it also means a visitor on an unannounced address never sees the map at all. |
| 6 | **Bounds on big collections** | 44 prefixes drawn of any number; 12 neighbours drawn of any number, chosen by RIPEstat's own `power` (how often they were observed), with the real totals always stated. | Phases 3-4 | Choosing *which* twelve is an editorial act, even when the ranking is published data. |
| 7 | **The physical form of the scale axis** | A controlled full-viewport surface: wheel/drag/pinch move a float and snap to a state; arrows and PageUp/PageDown move state to state. | Phase 3 | The brief explicitly asks for three models to be prototyped before choosing. Only one was built. |
