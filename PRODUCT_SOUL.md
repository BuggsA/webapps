# PRODUCT_SOUL.md — the character of `apps/ip`

**Read this before any substantial product-facing change to `apps/ip/`.**

This describes what the thing is *like*, and why. It is reconstructed from
the build conversation of 2026-09-15 → 2026-09-17 and from the locked design
documents it refers to. Where a choice was made by the owner, it says so.

Companion documents, all of which exist and are authoritative:

| file | what it holds |
|---|---|
| `docs/ip-narrative-and-outline.md` | the owner's original brief. The source. |
| `docs/ip-art-direction.md` | the locked visual direction, "Survey". |
| `docs/ip-plan-v2.md` | the current plan, phases A–I. Supersedes the old one from phase 5. |
| `docs/ip-build-plan.md` | how phases 1–4.5 were built and why. History, not future. |
| `docs/ip-render-research.md` | why WebGL2 and not Canvas 2D. |
| `docs/ip-infinity-research.md` | why the axis is the family's real bit depth. |
| `docs/ip-data-research.md` | the data architecture, and the no-third-party rule. |
| `PROJECT_STATE.md` | the running build log. Long. Authoritative on what happened. |

---

## 1. What the product is

**A beautiful "what's my IP".** Your public address, in the first frame, from
our own edge — and then, if you want it, the address space around it, which
is real, enormous, and explorable.

It is **an instrument, not an illustration**. From `ip-art-direction.md`:

> The page is one surveying instrument with a home position. It has a plate
> (the ground), an axis (the plumb line), a reticle (the polar rings at the
> origin), and a subject. Moving the scale moves the instrument, not the
> world. The subject changes; the chassis never does.

### Useful first — owner, 2026-11-11

> *"It should be an exploration type of thing but it should be useful first
> before anything."*

The first frame is a complete, ordinary, useful what's-my-IP answer — the
address, labelled; roughly where; through which provider; which internet —
and a plainly named way in. Exploration is offered, never required, and
never stands between a visitor and the answer they came for. Every fact on
it still comes from our own edge, says how approximate it is, and is not
kept.

## 2. What it is supposed to feel like

- **Immediate.** The address is there before anything else, always.
- **Quiet and dark**, with a lot of space around very few marks.
- **Held in the hand.** Scale is a continuous thing you pull, not a set of
  slides you click through.
- **Truthful to the point of austerity** — and then, once that is earned,
  **willing to enjoy itself.** The owner had to correct four separate drafts
  that trimmed the enjoyment away; see §7.
- **Wonder, not decoration.** The bar the owner set early: *"It is supposed
  to look better than pictures."*

## 3. Visual philosophy

The governing sentence, from the brief and repeated in the art direction:

> **The geometry must remain accountable to the data.**

And the consequence, which is the whole aesthetic argument:

> The beauty is not applied afterward; it is what a truthful diagram of this
> data looks like when it is drawn carefully, at the right scale, in the
> dark, with enough space around it.

**If a mark's position or brightness cannot be explained by a number, it is
removed — not restyled.** Two earlier directions (Cordage, Sea Fire) were
rejected for inventing a geometry and hanging data on it. See
`docs/ip-art-direction-rejected-seafire-cordage.md`.

### Colour — three roles, and only three

| role | meaning |
|---|---|
| **cream** | what you are being told |
| **cold blue** | structure that is not you |
| **amber** | **you, and amber is never spent on anything else** |

The amber rule is absolute and load-bearing. It is why travelling somewhere
your address is not leaves **no amber in the frame at all** — and that
absence is what makes the stated distance mean something.

**Age is drawn as brightness, never hue**, because age is not one of the
three roles. Unallocated space is the darkest thing on the plate (`0.055`)
because it is genuinely nothing; the gradient rises to `0.40` for pre-1990
space. The whole range sits below an answered lookup (`0.95`) and a network
footprint (`0.70`) so nothing known-without-asking can outshout something
actually asked about.

### Shape language

- **No border-radius. No box-shadow. No backdrop-filter. Anywhere.** These
  are banned in `ip.css` and the ban is deliberate.
- Marks are points, hairlines, rimmed surfaces and ground light pools.
- The chassis — ground plate, polar reticle, tick scale, plumb axis — is
  drawn identically at every state. That continuity is what makes many
  semantic states read as one place rather than many screens.

### Typography

- **Archivo, self-hosted, and nothing else.** No system-ui, no Inter.
- The address sizes itself from **its own character count** (`--addr-chars`),
  so the longest IPv6 (39 chars) and the shortest IPv4 both fit without one
  flattering the other.
- Lining, tabular numerals throughout — the product is made of numbers.

### Information density

Low, deliberately. A few marks in a lot of dark. The exception is the fields,
which are 4,096 cells — and those are kept legible by `spread()` (§6).

---

## 4. Motion

- **Scale is continuous; states are semantic.** Moving the axis dollies the
  whole scene; each state fades in over its own window.
- **Nothing animates before the answer is usable.**
- **Motion explains a change of scale or subject. Nothing decorates idle
  time.** No drift, no twinkle, no ambient parallax. This applies to sound
  too, when sound exists.
- **Reduced motion is a composed still**, and it is the basis of the saved
  image. Every state must be worth printing.

### The camera belongs to the hand holding it

**This rule cost three rejected implementations. Do not violate it.**

- A click sets the focus and moves **nothing**.
- Late-arriving data may fill in text; it may **never** move the frame.
- The visitor zooms at their own pace, and the framing converges on their
  choice by itself because every rung derives its container from the aim.
- Nothing is centred before it has earned it.

---

## 5. Navigation and interaction

- **The axis is held, not stepped.** Wheel and drag move a float; it does not
  snap. The keyboard steps between named stops because a keyboard is a
  stepping instrument.
- **Anything real on screen can be touched, and touching it does something.**
- **Act on what is displayed, never on a fresh raycast.** The parallax eases
  the camera between a pointer move and a click, so re-casting picks a
  different cell than the one being pointed at.
- **Text must never wait on a frame.** `syncDom()` recomputes the layer
  weights itself rather than reading values the render loop may not have
  updated. Violated three times; fixed three times.
- **The axis never stops because the data ran out.** An address with no
  announced prefix can still travel. Wandering is not a reward for having
  good routing data.

## 6. Invariants a future Claude must not break

These are in the source with comments explaining them. They were each learned
the hard way.

1. **Never turn an absolute address into a float.** 128 bits do not survive a
   float32 mantissa. Only ever an offset from the container that frames it.
   Satisfied by construction — a field is a container plus a cell offset
   never larger than 4095.
2. **`spread(n, full, floor)` — anything that can draw many marks at once
   goes through it.** Additive accumulation plus a generous bloom means N
   marks at one brightness read as a single white hole and the tone map
   crushes everything around them. This was discovered and patched separately
   **four times** (the block, landmarks, a network footprint, a query
   highlight) before being made one function.
3. **Never a number without something already seen to size it against.**
   "6 blocks" is inert; "6 blocks, and the one you just left announced 3,953"
   is a fact with a size.
4. **`SCREEN_X()`** — the camera faces +z, so in a right-handed world **+x
   renders on the LEFT**. Anything that must read left-to-right is laid out
   along −x. Flipped in exactly one place.
5. **Lit = known, dark = unasked** — except registry facts and landmarks,
   which are known without anyone being asked and may say so.
6. **No third-party address lookup, at any point, ever.** Rejected on the
   record in `docs/ip-data-research.md` §4. The address comes only from our
   own edge.
7. **Telemetry ships dormant** (`telemetry.js`, `ENDPOINT = ''`). No
   accounts, no server-side history.
8. **Deploy is human-run, always.** Claude prepares commands and never runs
   `aws`, `cdk`, or the deploy scripts.
9. **A canvas can only ever have one kind of context.** Once
   `getContext('webgl2')` succeeds, `getContext('2d')` returns null forever,
   so falling back means replacing the canvas element. The documented Canvas
   2D fallback never worked in the wild until 2026-09-17 because of this.
10. **Registration: `ZOOM` must equal `FIELD`.** A rung's container is one
    cell of the rung above, so the scale ratio between adjacent rungs is
    forced. Changing one without the other makes things measurably worse.

---

## 7. USER CORRECTIONS

Reconstructed from the conversation. Each is a real correction the owner
made, in their words where quoted.

### 7.1 Building everything at once

- **I produced:** a full end-to-end build of all phases in one pass.
- **Objection:** *"this was not meant to be one shot. Rather phases. You are
  doing too much right now. Plus I think it is hurting build quality."*
- **Why:** no gate between phases meant no chance to correct direction, and
  the craft suffered.
- **Replaced by:** phase-gated building. One phase, then stop and show it.
  The spike was rolled back to phase 1 and archived outside the repo.
- **Lesson:** *ship one phase and stop, even when the whole thing is clear.*

### 7.2 The picture was flat

- **I produced:** a Canvas 2D render built from 1px hairlines and `fillRect`.
- **Objection:** *"this is looking mad ugly… It looks like a dumb down
  version of photos. It is supposed to look better than pictures… I think you
  are taking the easy route."*
- **Why:** primitives that cannot carry light, with light implied by alpha.
- **Replaced by:** raw WebGL2 with HDR accumulation, a bloom chain, ACES,
  planar reflection and ground light pools. The owner's brief §7 and the
  house rules in `docs/building-a-new-app.md` were **amended on the record**
  rather than worked around.
- **Lesson:** *when the medium cannot carry the intent, change the medium and
  amend the rules openly — do not fake it.*

### 7.3 Render settings exposed in the UI

- **I produced:** a visible panel of renderer tuning controls.
- **Objection:** *"they probably shouldn't have access to the render settings
  to modify things. I think it takes away from it all."*
- **Replaced by:** no settings. The tuned values live in the source.
- **Lesson:** *the instrument is composed. Do not hand the visitor its
  calibration.*

### 7.4 Wandering being squeezed out by renderer work

- **Objection:** *"I mentioned the last point so they can wander. It seems
  like that aspect is kind of getting removed from this. Please remember they
  should wonder and be able to wander and explore."*
- **Replaced by:** the standing rules in `ip-build-plan.md` under *"The thing
  that must not get squeezed out."*
- **Lesson:** *the load-bearing mechanic is chosen movement through real
  named networks, not a prettier picture of one.*

### 7.5 The zoom — three separate corrections

This is the most-corrected area in the project.

1. **`arrive()`** re-aimed the axis at whatever prefix the lookup announced.
   Objection: *"I kind of want the zoom to follow the last click. Not
   whatever it is."* The camera moved a second time, on its own, a beat late.
2. **A flight to the clicked cell.** Objection: *"I would like to zoom in
   myself click then that is new focus I zoom in at my pace on it with the
   center not being what you clicked until you get in far enough."*
3. **Layers that did not register.** Objection: *"it feels less like you are
   going to the point you click."* Cause: each rung ran its own local Hilbert
   curve, so the same block appeared in two places 23px apart through every
   cross-fade.
- **Replaced by:** a click moves the aim and nothing else; one global Hilbert
  curve so the rungs register exactly; the convergence survives as a **rigid**
  translation of the whole stack.
- **Lesson:** *the camera belongs to the hand holding it. When an interaction
  keeps feeling wrong, the cause is more likely structural than cosmetic —
  and the problem is probably solved in the literature (pointer-anchored
  zoom; van Wijk & Nuij 2003).*

### 7.6 Trimming the fun — four times

- **I produced,** repeatedly: cuts to completion counts, badges, metrics,
  leaderboard-style comparison, celebration banners, and a narrator's licence
  to exclaim, congratulate or be sarcastic.
- **Objections:**
  - *"Hmm all the things you cut seemed great to have."*
  - *"I disagree with most of what you said besides the off switch."*
  - *"remember don't kill the fun."*
  - *"Can you stop trying to damper the fun and write the build plan?"*
- **Why:** they were taste presented as judgement. The owner's argument, and
  it is correct: *"People get excited about the congratulation confetti in an
  email that means absolutely nothing. It drives them… humans sometimes value
  really stupid stuff. But they sometimes really really enjoy it."*
- **Replaced by:** all of it kept. Celebrations, counts, metrics, badges, a
  guide with character. `docs/ip-plan-v2.md` carries a standing note in the
  guide section telling future sessions **not to reintroduce the restraint
  rules**.
- **Lesson:** *this is the single most repeated failure in the project. When
  about to remove something enjoyable for reasons of taste or tone, do not.*

### 7.7 Dropping the quest taxonomy from the plan

- **I produced:** a plan that compressed main/side/optional/gated quests into
  one bullet.
- **Objection:** *"Also there isn't one side quest there are multiple… Actual
  quests. Main side, optional, mandatory for some others to do, etc. Did you
  look at our conversation?"*
- **Replaced by:** phases E and F with the full taxonomy, and a narrative
  section that had also been lost.
- **Lesson:** *when summarising a long conversation into a plan, the specific
  things the owner asked for are the first casualties. Check the transcript.*

### 7.8 "The payoff is the return"

- **I produced:** an argument that exploration's reward is coming home with
  your own address newly meaningful.
- **Objection:** *"They don't want to return back to the starting point."*
- **Why:** it is a tourist's model. Confirmed by data — only ~31.5% of Skyrim
  players ever finish the main quest; people go on, not back.
- **Replaced by:** the four-beat open-world loop — see something from here, go
  to it, get something, and from the new position see the next thing.
- **Lesson:** *do not let a tidy narrative shape override how people actually
  behave.*

### 7.9 Inventing a frame and presenting it as ours

- **I produced:** a reframing of phase B as "the vista" - the tower climb,
  cresting a hill - delivered in the same voice as the research we had
  actually done together.
- **Objection:** *"Does this follow what we talked about in the past?"*
- **Why:** it did not. Grepping the transcript showed "vista", "tower" and
  "crest" appeared almost nowhere except **my own message from ten minutes
  earlier.** The conclusion it produced was right; the frame was mine and was
  wearing the clothes of our shared history.
- **Replaced by:** "the trail", which was already in the product -
  `S.trail`, *"where the aim has been, so there is a way back"* - and which
  the plan's own wording had been describing all along.
- **Lesson:** *when reframing, say which part is ours and which part is mine.
  An invention in the voice of shared history is the hardest thing for the
  owner to catch, because it sounds like something they already agreed to.*

### 7.10 Asserting a number instead of computing one

- **I produced:** "forty-odd lines", repeatedly, as the size of phase D.
- **Objection:** *"why the forty thing? Is that even the right number? It was
  mentioned before by yourself and I don't even know why."*
- **Why:** it was mine and unjustified. The tell was that **the same number
  was doing duty for two unrelated quantities** - lines to write, and marked
  sites as a completion denominator. A number that fits two unrelated things
  equally well was never computed for either.
- **Replaced by:** an actual count derived from the frequency tiers (~123),
  and then the better answer that **it is not a line count at all** - it is
  the frequent buckets, because nobody forms an opinion of a guide from a
  line they hear once.
- **Lesson:** *a number in a plan is a claim. Compute it or do not state it.*

### 7.11 Writing before knowing the story

- **I produced:** a plan to start writing the guide's lines.
- **Objection:** *"I think that may be the wrong move. I think maybe we need
  to think of the story first. What narrative can be told?"*
- **Why:** correct, and the plan's own "Still open" said the same thing. The
  side lines existed as six **titles with no chains**.
- **Replaced by:** the story research, then the emotional architecture, then
  the two-audience constraint, then the writing - in that order.
- **Lesson:** *the owner's instinct about ordering has been right every time
  it has disagreed with mine.*

### 7.12 Exploration that has no direction

- **I produced:** a sightline system, built specifically to fix beat one, and
  a report that it worked.
- **Objection:** after days of actually wandering - *"It just feels
  undirected. I feel like there isn't much value in exploring."* And when
  offered four diagnoses, three were true; the one that was false -
  *"I know where to go, but I don't care"* - was false **only because they
  did not know where to go in the first place.** The destinations they could
  name were *private IP space* and *the brighter orbs*.
- **Why:** measured afterwards, and the measurement was damning. Sightlines
  are **hidden for the first quarter of the axis** - home and the block view,
  the first minute of every visit - and across eight axis positions they
  produce **essentially one repeated suggestion.** The map's entire visual
  vocabulary of destinations is brightness. Text at the bottom of the screen
  was carrying beat one alone, and text cannot do that.
- **Replaced by:** not yet. The direction proposed is that the map must show
  **territories** - adjacent cells differing in registry or country are a
  border, the border is in the data, and hairlines are already a permitted
  material.
- **Lesson:** *a feature that passes its own tests can still fail its
  purpose. "I built the thing that fixes X" is a claim about mechanism; only
  somebody using it can tell you about X. Measure the experience, not the
  implementation - and the owner wandering for days is worth more than every
  check in this repository.*

### 7.13 The two outside reviews

The owner brought two independent reviews of the writing. Both were acted on
and both found things no check here would have. The findings worth carrying:

- **"It loves its sentences more than it respects its evidence."** Correct,
  and it produced §8.9 below.
- **The pool had no memory** - twelve lines at random are exhausted by visit
  four, while the notebook sitting right there already knew where you had
  been.
- **Beat 4 was wrong for IPv4**, the family most visitors arrive on, and it
  is the beat every visitor walks.
- **Lesson:** *a fresh reader finds structural faults that the person who
  built the structure cannot see. Ask what is wrong with the SHAPE, not the
  lines - line-level critique produces opinion, structural critique produces
  bugs.*

---

## 8. ANTI-PATTERNS — do not regress

### 8.1 Canvas 2D as the primary renderer
Rejected. It cannot carry the light: line width is capped at 1px by ANGLE and
a bloom chain is unaffordable. Damaged: the entire visual premise.
**Preferred:** WebGL2 primary, Canvas 2D as an honest fallback.
**Recognising a variant:** any proposal to "simplify" the renderer, drop the
bloom chain, or replace feathered line quads with native `GL_LINES`.

### 8.2 Inventing a geometry and hanging data on it
Rejected twice by name (Cordage, Sea Fire). *"Sensation with no referent is a
fidget toy."* Damaged: truthfulness, which is the whole aesthetic argument.
**Preferred:** every position computed from a real number by a rule statable
in one sentence.
**Recognising a variant:** decorative particles, ambient motion, a colour
ramp that encodes nothing, a layout chosen because it looks good.

### 8.3 The camera moving itself
Rejected three times (§7.5). Damaged: the sense of holding an instrument.
**Preferred:** the axis only moves when the visitor moves it.
**Recognising a variant:** any auto-focus, auto-frame, fly-to, "snap to
state", or re-centring on late-arriving data.

### 8.4 Trimming the enjoyment on grounds of taste
Rejected four times (§7.6). Damaged: the reason anyone would stay.
**Preferred:** celebrate properly, in this app's own material — the mark
ignites, the flare blooms, the floor catches it, a ring runs out, and the
guide says something.
**Recognising a variant:** "that feels a bit much", "let's keep it
restrained", removing a counter because it is "gamified", muting a narrator,
adding a rule that begins "never".

### 8.5 Fear appeal
Rejected pre-emptively and recorded. Privacy pages demonstrably work by
arousing fear, and this one could farm that tomorrow. The brief forbids it:
**"the ending informs rather than alarms."** Damaged: it would make this a
different and worse product.
**Preferred:** show how little was kept, and let the relief be the payoff.
**Recognising a variant:** "WE KNOW WHERE YOU ARE", scare copy, a countdown,
anything that dramatises exposure.

### 8.6 A leaderboard or any server-side history
Rejected on architecture, not taste: there is no server, and *"seen for this
response, not kept"* is the spine of the product.
**Preferred:** the exported card (phase G) — you show your friend, no server.
**Recognising a variant:** accounts, "save your progress", analytics that
identify, any storage that is not `localStorage`.

### 8.7 Generated content used to fill space
The **ghost tier was nearly cut by mistake** and then restored as phase I —
but it is narrowly scoped: **deep rungs only**, ghost *networks* not terrain,
and **no invented names or AS numbers**. Damaged if widened: the four grades
of truth.
**Preferred:** real things cast light and have a reflection; imagined things
are line drawings the floor refuses to acknowledge.
**Recognising a variant:** procedural filler where real data exists, invented
holders, plausible-looking numbers with no source.

### 8.8 A narrator that congratulates the visitor rather than observing the world
This is the one restraint that survived the owner's pushback, and it is a
*presentation* line, not a mechanic: the guide may exclaim, celebrate and be
sarcastic, but **"Great job!"** aimed at the visitor turns the instrument
into an onboarding flow. It also **must have an off switch that persists.**

### 8.9 Laundering an empirical claim through the narrator

Rejected 2026-09-18 after outside review. I had written a rule saying that a
thought which could not be evidenced could be **moved into his observation**
and thereby made safe. *"Most of what I have looked at looks like this."*

**It is not safe.** Nothing records what he has looked at, so it is a claim
about the world wearing a narrator's coat. The instrument's founding promise
is *lit = known, dark = unasked*; a renderer that refuses to guess, narrated
by someone who guesses freely, is one product lying to itself.

**Preferred:** four named classes, and nothing else. (1) What the instrument
looked for and found or did not find. (2) Disposition - what he likes, what
steadies him. (3) The overwhelmingly likely reading of a record already on
screen, phrased as inference. (4) Hyperbole nobody could mistake for data.

**Recognising a variant:** any sentence where the narrator's "I" is carrying
a quantity. *"Most of"*, *"there is a lot of"*, *"more than anybody
expects"* - the first version of these lines had three survivors after I
wrote the rule banning them, because I never applied it backwards.

### 8.10 Telling the visitor that what they found is boring

Rejected 2026-09-18. Three of twelve lines in the most-heard bucket did this:
*"Thrilling. Look at it."* / *"I remember nothing about it, and neither will
you."* Damaged: the loop. Somebody chose to go and look at that, and the
first thing said about it was that it was nothing.

**Preferred:** the wry mode points at the internet and at him. **It never
points at the thing the visitor just chose to go and look at.**

**Recognising a variant:** any line whose joke requires the find to be
worthless. Also its polite cousin - *"unremarkable"*, *"the best thing you
can say about it is that you have never heard of it"* - which is affectionate
to infrastructure and still tells somebody their choice was dull.

### 8.11 Content that can never fire

Rejected 2026-09-18. Two cold-open branches needed the registry; the registry
is deferred until the visitor moves; the cold open fires when content lands,
which always wins because it is 30KB against 439KB. **They could never have
run.** The cold open itself had the same shape of fault - it was deferred
behind the very movement it exists to cause.

**Preferred:** anything conditional gets asked *when can this actually be
true?* before it gets written. The linter now checks fallback ordering and
dead branches on every regeneration.

**Recognising a variant:** a `when`, an `only[]` or a gate whose condition
depends on something that arrives later than the trigger.

### 8.12 A hand-written section that states the state

Rejected 2026-09-18. The generated review document had a hand-written
"deliberately not written yet" section. It went stale **the moment the main
line was written**, and an outside reviewer found it before I did.

**Preferred:** anything that describes what exists is derived from what
exists. That section now computes itself on every regeneration.

**Recognising a variant:** any prose in a generated artefact that a future
change would silently falsify - counts, status, "not yet", "currently".

---

## 9. Copy voice

- Terse. Factual. Full sentences.
- **Never states a number without sizing it.**
- Says what is *not* known as plainly as what is: *"Nothing announces you. It
  happens more than you would think."*
- Admits the edge of the data. The honest limit of a survey is part of the
  subject.
- The guide (planned, phase D) is **a surveyor who has spent years here and
  is delighted to have company** — has favourites and grudges, celebrates,
  is sarcastic when a find is dull and then usually relents. Sample lines and
  voice rules are in `docs/ip-plan-v2.md` under "The guide".

### Empty, loading and error states — all designed, none accidental

- **No announced block:** *"Your address is still your address, and the space
  around it is still there. Keep going out."*
- **Address unavailable:** *"This page could not read your address from its
  own edge, and it will not ask anyone else for it."* — the refusal is the
  point.
- **Asked and nothing there:** marked, but dimmer. *"Nothing is announced
  here"* is a real answer, not an absence.
- **No renderer at all:** one quiet line on the bottom. Not an apology, not a
  dialog — the address is the product and it is right there.

---

## 10. Canonical product references

Every path below was verified to exist on 2026-09-17.

### `apps/ip/ip.js` — the whole application
Single file, ~165 KB, no dependencies. A MAP-of-file comment at the top lists
the sections; grep the ALL-CAPS tags (`CONFIG`, `UTIL`, `STATE`, `CAMERA`,
`SCENE`, `GL`, `C2D`, `RENDERER`, `AXIS`, `DATA`, `DOM`, `BOOT`).

- **Demonstrates:** the entire instrument.
- **Intentional:** the density of *why* comments. Many record a specific
  failure and the reasoning that fixed it. They are not clutter; several
  exist because the same mistake was made twice.
- **Can evolve:** new phases, new sections.
- **Do not casually normalize:** the file being one file with no build step;
  `SCREEN_X`; `spread()`; the `var`-only ES5 style (deliberate, no
  transpiler); the comment density.

### `apps/ip/ip.css` — the visual rules
- **Demonstrates:** three colour roles, the bans, `--addr-chars` sizing.
- **Intentional:** no border-radius/box-shadow/backdrop-filter; `#plate
  button.ask` opting back into pointer events inside a `pointer-events: none`
  plate; `#copy[hidden]` and `#controls button[hidden]` needing explicit
  `display: none` because an author `display` outranks the UA `[hidden]` rule.
- **Do not casually normalize:** the bans, the single font, the three roles.

### `apps/ip/index.html` — the contract
- **Demonstrates:** the address as a real element, first in focus order.
- **Intentional:** its header comment — *"nothing optional is ever allowed in
  front of it. No modal, no consent, no tutorial, no onboarding — not now and
  not in any later phase."* This is a promise, not a description.

### `apps/ip/data/space.bin` + `scripts/ip-build-space-field.py`
- **Demonstrates:** the registry layer — every allocation, with registry,
  country and exact year; 438,937 bytes gzipped.
- **Intentional:** exact years were kept over five named eras (343 KB)
  because they buy a per-place fact about every block in the world. The
  script's docstring records four cleverer encodings that all **lost** to the
  naive one. Do not re-derive them.

### `apps/ip/telemetry.js`
- **Demonstrates:** dormant by construction, `ENDPOINT = ''`.
- **Do not casually normalize:** do not wire it to anything.

### `hosting/edge/ip-whoami.js`
- **Demonstrates:** the address read at the edge, never from a third party.
- **Verified live 2026-09-17:** `X-Cache: FunctionGeneratedResponse from
  cloudfront` — generated at viewer-request, never reaching the origin.

### `docs/ip-art-direction.md` — the locked direction
- **Do not casually normalize:** anything in "Banned", and the thesis.

### `apps/ip/content/guide.json` — the guide, as data
126 lines across 42 buckets. **Nothing in `ip.js` names any of them.**
- **Demonstrates:** the owner's governing requirement - adding a line, a
  quest or a story means adding rows, never editing logic.
- **Intentional:** `_evidence` names the four allowed classes of claim and
  the one that is forbidden. `_modes` and `_when` exist so the ratios and
  thresholds can be reviewed rather than discovered in code. `_delivery`
  records that the scheduler is a hard requirement, not a nicety.
- **Do not casually normalize:** the mode ratio (60/25/15 in the frequent
  tiers), the ban list, the one permitted use of *beautiful* - still unused.

### `apps/ip/content/lines.json` — the chains
9 chains, 29 beats. **Loaded and never read.** That gap is the next phase.
- **Intentional:** `_reframe` records that beats 6 and 8 of the main line
  share one sentence **verbatim** and that editing one without the other
  breaks the ending. Two chains carry `provisional` and must not ship.
  17 of 29 beats are `find` rules the engine resolves, so the chains work on
  data nobody chose in advance.

### `scripts/ip-narrative-review.py` — the linter and the review doc
- **Demonstrates:** rules written precisely enough to check. Banned words,
  verbatim duplicates, family-assuming phrases, fallback ordering, the
  open-mode ceiling, provisional chains.
- **Intentional:** it regenerates `docs/ip-narrative-all.md` rather than
  anyone maintaining a copy, and its state section derives from the content.
- **Every check in it exists because a human found that fault first**, after
  it had already shipped into a file.

### `docs/ip-build-plan-v3.md` — what is left, and in what order
The plan of record for remaining work. `ip-plan-v2.md` keeps authority over
what each phase *means*.

### The reasoning behind the writing
`docs/ip-guide-voice.md` (character and craft, including the evidence rule),
`docs/ip-emotional-design.md` (the eight-beat arc and what breaks it),
`docs/ip-two-audiences.md` (the novice and the thirty-year veteran),
`docs/ip-story-research.md` (what the history can actually support),
`docs/ip-exploration-research.md` (why exploring feels the way it does).

### `docs/ip-plan-v2.md` — what happens next
- **Intentional:** the standing note in "The guide" telling future sessions
  not to reintroduce the restraint rules that four drafts kept adding.
