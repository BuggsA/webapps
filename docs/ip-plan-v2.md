# ip — build plan v2

**Supersedes the phase list in `ip-build-plan.md` from phase 5 onward.** That
document stays as the record of how phases 1-4.5 were built and why; it should
not be read as a description of what happens next. This one is what happens
next.

Written 2026-09-17, out of a long conversation with the owner that started
with "exploring feels a bit empty" and ended somewhere quite different from
where either of us expected.

---

## What is already built and live

Phases 1, 2, 3, 3b, 4 and 4.5 step 1, deployed at `/ip/`:

the address in the first paint from our own edge · the WebGL2 renderer with a
Canvas 2D fallback · the announced block · the address-space ladder at the
real bit depth of the family (IPv4 2.67 steps, IPv6 10.42) · travel, where
choosing a block re-points the instrument and your own address becomes a
stated distance away · zoom that converges on what you chose · landmarks ·
the network footprint, where arriving somewhere lights every other block that
network announces.

## What the conversation established

**1. The emptiness was never a content problem.** Open worlds work on a
four-beat loop — *see something from here, go to it, get something, and from
the new position see the next thing.* Bethesda places points of interest
within sight of one another; Breath of the Wild introduces one roughly every
forty seconds. This app had beat two and a weak beat three. It had nothing
at all for one and four, which are the beats that make it a loop rather than
a sequence. Everything that felt missing follows from that.

**2. The sightline mechanism is already built.** The network footprint —
arriving somewhere lights up every other block that network announces — IS
beat four. It was built as an information feature and used as a caption. From
Akamai you can see 3,953 places to go next; from RIPE NCC, six. The
internet's own topology is the level design, so nobody has to author it.

**3. The map is not empty, it is drawn as empty.** Measured: from the
registry data alone, 86% of cells at the whole-IPv4 view and 100% at every
deeper view already carry a country, an era and a registry. 239 countries at
the top, one at the bottom. Nothing has to be invented or asked for; it is
291 KB, gzipped, and it is sitting on disk unused.

**4. Humans value some genuinely stupid things and that is fine.** The
owner's argument, and it is correct: people love the confetti in an email
that means nothing. Celebrations, badges, counts, completion and bragging
rights all stay in. Three separate times these were trimmed on aesthetic
grounds and called judgement; they were taste.

**5. The quests are a curriculum.** The strongest idea in the whole
conversation, said in passing: *"a way to learn the basics of how networking
works."* This gives the authored content a reason to exist beyond the hit,
and the syllabus is the things people are already wrong about — that
geolocation is accurate, that an address is fixed, that an IP reveals only a
place, that it identifies a person.

**6. A rotating IP is free replayability.** Most home addresses change. Come
back next month and you start somewhere else, in different space, with
different neighbours. Nothing needs to be stored for that to work.

## Rules that hold for everything below

- **The axis belongs to the hand holding it.** Late-arriving data may fill in
  text; it may never move the frame. Nor may a click.
- **Never a number without something already seen to size it against.**
- **Amber is only ever the visitor.**
- **Lit = known, dark = unasked** — except registry facts and landmarks,
  which are known without asking and may say so.
- **No third-party address lookup, ever.** No accounts, no server-side
  history. `ENDPOINT = ''` stays.
- **Celebrate properly.** The instrument flares, the mark blooms, the floor
  catches it, a ring runs out across the field, and the guide says something.
  Use the material this app already has because it will hit harder than
  confetti, not because confetti is beneath it.
- **Chains are offers, never requirements.**
- **Content is data, never code.** A new quest, site, story or achievement is
  a row in a JSON file. If anyone has to open `ip.js` to add a side line,
  something was built wrong.

---

## Beauty and wonder — what the research says, and what it changes

Researched 2026-09-17, after the owner pointed out that the first draft of
this plan was all systems and no beauty. It is the name of the game and it
had fallen out of the document entirely.

### Awe has two necessary conditions, and we currently deliver neither

Keltner & Haidt, *Approaching awe* (2003), the standard account: awe requires
**perceived vastness** and a **need for accommodation** — an inability to fit
the experience into existing mental structures. Vastness may be physical,
temporal, or any conceptual dimension.

Measured against that:

- **Vastness is stated, not perceived.** The app prints
  "18,446,744,073,709,551,616". A number is not vastness; it is a string. No
  one has ever felt small next to a string.
- **There is no accommodation at all.** Nothing the app shows contradicts
  anything the visitor already believes. Nothing has ever made anyone say
  *wait, that cannot be right.*

That second one is the sharper diagnosis, and it is the whole answer to "I
see the wonder but not quite."

### The sublime is a comprehension attempt that fails

Kant's mathematical sublime is more specific and more useful. The feeling
comes from a tension between **taking a magnitude in successively, part by
part**, and **failing to unify those parts simultaneously**. "The effort
toward comprehension surpasses the power of the imagination."

The load-bearing word is **effort**. The sublime is not delivered by being
told a size. It is produced by *attempting* to hold something and failing.

The ladder is structurally a machine for exactly this — 4,096 cells a rung,
up to eleven rungs, wholly unholdable — and the app has never once asked
anyone to try. Each rung cleanly replaces the last. Nothing accumulates, so
nothing overflows, so there is no failure, so there is no sublime.

### Accommodation and the curriculum are the same mechanism

The VR awe literature finds that sublime design elements measurably raise awe,
and that the strongest effects come from **obscure events that turn out to be
reasonable** — surprise that resolves into sense.

That is precisely a misconception being corrected. *This block is registered
in Sweden and announced from Chicago — oh, because routing is not geography.*

So the curriculum in phases C and D is not a separate educational strand
bolted to the side of an aesthetic experience. **Every misconception broken is
an accommodation event, and accommodation is half of awe.** The quests are
the wonder engine. Build them as wonder, not as lessons.

### What was already locked, and still holds

From `ip-art-direction.md`, and it should not be relitigated:

> The beauty is not applied afterward; it is what a truthful diagram of this
> data looks like when it is drawn carefully, at the right scale, in the
> dark, with enough space around it.
>
> **The geometry must remain accountable to the data.**

Two consequences for this plan:

- Phase A's era and country rendering must be **computed positions and
  values**, not a decorative overlay. If a mark's colour cannot be explained
  by a number, it is wrong.
- The celebration flare is a **response to an event**, never ambient. The
  motion rules already ban decorating idle time: no drift, no twinkle.

### Three design consequences

**1. Make the comprehension attempt happen.** Do not state the size; build
the failure. The descent needs to accumulate rather than replace, so that at
rung eight the seven above are still felt. The rail does a little of this and
almost nothing of what it could.

**2. Show the previous frame as one cell of the current frame.** This is the
*Powers of Ten* move and it is the literal mechanism of perceived vastness:
not "this is 4,096 times bigger" but *watching the place you just stood
become one dot in the place you are now.* The app has never done it. Every
rung replaces the last with no visual link between them, which is why travel
reads as changing slides rather than pulling back.

**3. Every accommodation moment is a set piece.** When a misconception breaks,
that is the emotional peak of the entire product, and it should be built like
one — the flare, the guide, the whole instrument reacting. Not a line of copy.

### The reframe this forces

**Layer registration is not polish. It is the wonder mechanism.**

It was deferred twice as a cross-fade artefact — measured at 6px of
disagreement, "tolerable". That assessment was correct about the artefact and
wrong about the stakes. Registration is what makes consequence (2) possible:
you cannot watch where you were become one cell of where you are unless the
two levels are drawn in the same coordinate frame.

The unbounded-Hilbert redesign therefore stops being a deferred nicety and
becomes the single highest-value visual work in the plan. It is also what
unlocks free spatial panning, which was deferred alongside it.

It does not go first — phase A still tests the cheaper premise — but it
should be understood as **the thing that makes this app sublime rather than
merely legible**, and it should not be quietly deferred a third time on the
grounds that six pixels do not matter.

---

## The guide

**Note for whoever builds this.** Four drafts of this section tried to
restrain the guide — no exclaiming, no congratulating, one opinion per note.
The owner rejected all of it, and was right: those rules produce something
correct and joyless. **Do not reintroduce them.** The guide is the thing that
turns a spreadsheet in three dimensions into somewhere worth being. Let it
have a good time.

### Who

A surveyor who has spent years mapping this space and is delighted to finally
have company.

- Knows the place cold, and still finds bits of it ridiculous.
- Has favourites, grudges and opinions, and shares them unprompted.
- Celebrates with the visitor. Actually pleased when they find something good.
- Sarcastic when a find is unremarkable, and then usually relents and admits
  it is interesting after all.
- Pushes. Tells them where to go next, and gets a bit impatient.
- Occasionally says outright that something is beautiful, because it is.

### How it sounds

Arriving:

> That is you. All four of those numbers had to be agreed on by somebody.
> Let us go and find out who.

Finding the announced block:

> AS3333. Six blocks. That is tiny — I have been in networks with four
> thousand. No shade intended. Some of my favourite places here are small.

A landmark, grudge showing:

> A sixteenth of all IPv4, set aside in 1981 for a future that never showed
> up. Forty-five years. Still empty. I think about it more than I should.

Pushing toward the next site — the clue and the character in one line:

> Something is wrong three blocks from here. Registered in Sweden, announced
> out of Chicago. Go and look at it, I will wait.

An egg:

> Oh, lovely. 127.0.0.1. Sixteen million addresses that all mean *here* and
> nobody has ever needed more than the first one. Absurd. I adore it.

Sarcasm, then the relent:

> Congratulations, you found an empty block. There are about six hundred
> million of those. ... All right, fine, that one is interesting — it has
> been empty since 1991 and somebody is still paying for it.

Finishing a line:

> That is the whole line. You now understand something a lot of people who do
> this for a living have backwards. Genuinely well done.

The inward turn:

> Right. Enough of out there. Turn it around — I want to show you what you
> handed over just by showing up.

### What makes it good

- **Delight is the point.** When something is wonderful the guide says so.
- **It has taste.** Preferring some places to others is what makes it a
  character rather than a label printer.
- **It is on the visitor's side.** Pleased when they do well, and the humour
  is never at their expense — the internet is the punchline, not them.
- **It knows when to shut up.** Long quiet stretches while someone wanders
  off-line are correct. It does not chase.
- **It admits ignorance.** Where the data stops, it says so. The honest edge
  of a survey is part of the subject.

### Off switch

Silenced permanently from the controls, and the choice persists. The map, the
notebook and every site still work without it. A product that cannot be told
to be quiet does not trust its own map.

---

---

## The content format — everything is data

**Requirement from the owner, and it governs every phase below: adding a
quest, a story, a site or an achievement later must mean adding rows, not
editing logic.** If anyone ever has to open `ip.js` to add a side line, this
was built wrong.

Four files, shipped beside the app, loaded with the deferred data in phase A:

```
sites.json     a marked place        { id, cidr, name, note, teaches, near }
lines.json     a quest               { id, kind, title, beats[], needs[] }
records.json   an achievement        { id, label, when }
guide.json     what the guide says   { id, on, text[], only[] }
```

- `kind` is `main` | `side` | `egg` | `depth`. There is exactly one `main`.
  There are as many of the others as anyone ever writes.
- `needs[]` is the gate: other line ids that must be complete first. Empty
  means always available.
- `when` on a record is a small declarative condition — *visited a site of
  kind X*, *crossed N countries*, *descended to rung N*, *found a block older
  than YYYY*. A fixed vocabulary of conditions, evaluated against the
  notebook. New achievements are new rows; new **kinds** of condition are the
  only thing that ever needs code.
- `text[]` on a guide line is a list of alternatives, picked at random, so a
  second visit does not replay the first word for word.
- `only[]` narrows a line to a kind of visitor — `v6`, `cgnat`, `no-prefix`,
  `era<1995`, `rir=afrinic`. This is what makes the cold open below work.

**Forward compatibility.** Unknown fields are ignored, unknown `kind`s are
skipped rather than fatal, and every file carries a version. A visitor with a
stale cache and a new manifest gets a working app, not a broken one.

**A content version stamp**, so the notebook can say *four new sites since
you were last here.* Returning visitors get a reason to come back that costs
nothing to produce beyond writing the sites.

**Authoring never touches the renderer.** A new side line is: write the JSON,
reload. That is the whole loop. If writing forty lines is meant to happen in
one sitting (phase E), the loop has to be that short.

---

## The cold open

**The first thing the guide says is about the visitor's own address**, and it
branches. Someone arriving on IPv6 from a Nordic university gets a different
opening from someone on carrier-grade NAT on a phone in Brazil. Come back
next month on a rotated address and the opening may differ again.

This costs nothing — every fact it branches on is already known in the first
frame or the first lookup — and it is the single highest-leverage piece of
writing in the product, because it is the moment someone decides whether this
thing is worth their attention.

Branch on what is already free:

| condition | the opening changes because |
|---|---|
| IPv6 | they can go four times deeper than anyone on v4, and should be told |
| `100.64.0.0/10` | that address is not theirs, their carrier is lending it |
| private / link-local | something is unusual about how they got here |
| no announced prefix | nothing speaks for them; the guide works with it rather than apologising |
| block allocated pre-1995 | they live in old space, which is rarer than they think |
| block allocated 2015+ | they live in the crowded part |
| their RIR / country | the guide has opinions about regions |
| inside a landmark range | *you are in the documentation prefix — are you testing something* |

Sketches, to be written properly in phase E:

> IPv6. Good. You can go four times further down than most people who come
> through here, and I intend to make you.

> That address is not yours. Your carrier is lending it to you and will want
> it back. We can still work with it.

> Nineteen ninety-three. You are living in old space and you probably did not
> know that. Most of what is out here is younger than you are.

> Nothing announces you. It happens more than you would think, and honestly
> it makes the next part more interesting rather than less.

- One opening per visit. Never two. It is a greeting, not a briefing.
- If the guide is switched off it does not run, and nothing else changes.
- **Exit:** two people on two different networks get two different first
  sentences, and both are true.

---

## The tracker

The visitor must always be able to answer *what am I doing and did I just do
something* without hunting for it.

- **The moment of hitting an objective is loud.** The flare, the ring, the
  guide, and the objective visibly crossing off. Never a silent state change
  — if a beat completes and nothing happens, the beat may as well not exist.
- **The current objective sits on screen**, one line, quiet, always. Not a
  panel. It is the answer to "what now" for anyone who looks up after being
  distracted for ten minutes, which is everyone.
- **Three modes, and it remembers which:**
  - *full* — current objective plus the open lines, and how far into each
  - *minimal* — the current objective only, one line (default)
  - *hidden* — nothing at all; the notebook still records everything
- **Crossed-off is kept and visible.** The struck-through beats above the
  current one are the visible evidence of a journey and they are half the
  pleasure of a tracker. Never clear them; a completed line collapses into
  one struck line that can be reopened to read.
- Several lines open at once, so the tracker shows the most recently advanced
  one by default and any other can be pinned.
- **Exit:** someone who comes back after a week can tell in one second what
  they were in the middle of.

---

## Sound

Never discussed by anyone until 2026-09-17, which was an oversight. A
celebration with no sound is half a celebration.

**Synthesised, not sampled.** WebAudio oscillators and envelopes, no files.
Zero bytes shipped, and — more to the point — it keeps the governing rule:
*the geometry must remain accountable to the data.* A sampled chime is
decoration. A tone computed from the address is the same kind of object as
every mark on screen.

### The gift that was already sitting there

`layers()` implements a **Shepard tone**. Superposed octaves, each fading in
as the one before it fades out, weights summing to one — it was built that
way for visual reasons and nobody noticed what it was until the infinity
research (see `ip-infinity-research.md` §2).

So: **play it.** As the visitor moves the axis, sound the layer stack. The
auditory Shepard tone is the illusion of a pitch that descends forever
without getting lower, and it is produced by *exactly the equation already
running every frame.* The picture and the sound are the same mathematics,
which is not a metaphor and not a flourish — it is the same array of weights,
read twice.

Nothing else in this app will ever get that close to its own subject.

### What makes noise

- **The descent.** The layer stack, sounded. Moving the axis is audible, and
  the endlessness is audible in the same way it is visible.
- **Your address has a tone**, derived from its number. Two people hear
  different notes. Come back on a rotated address and it has changed, which
  is a fact about IP addresses delivered through the ears.
- **Recording a site.** A clear bright strike, at the same instant as the
  flare and the ring. This is the confetti moment and it should ring.
- **Finishing a line.** A fuller version of the same, once.
- **Arrival at a landmark.** Quiet, low, one note. A room-tone change, not an
  announcement.
- **The inward turn (phase H).** The outward sound stops. That silence is the
  loudest thing in the product and it should be used deliberately.

### Rules

- **Off until asked.** Browsers block autoplay anyway, so the first gesture
  enables it; one control, remembered in `localStorage` beside everything
  else.
- **Respects `prefers-reduced-motion`** as a hint to start silent, since the
  same people often want the same thing from both.
- Never a loop that plays on its own with nothing happening. The motion rule
  — *nothing decorates idle time* — applies to the ears too. Silence is the
  default state of this instrument.
- **Exit:** with sound on, moving the axis with your eyes shut still tells
  you which way you are going.

---

---

## The build order

Eight phases. Each one lands something you can open and look at, `node
--check` clean, and stops there. The order is chosen so the cheap tests come
before the expensive commitments, and so the app is never left in a state
that is worse than the one before it.

| | phase | why here |
|---|---|---|
| 1 | **A — The map stops being empty** | Cheapest, biggest, and it tests whether the map is fun to interrogate at all |
| 2 | **B — The descent becomes sublime** | The wonder mechanism. Everything after it is decoration if this is missing |
| 3 | **C — The notebook, and the noise it makes** | Accumulation and the payoff beat, which the quests then plug into |
| 4 | **D — Writing the guide** | No code. Do it in one sitting, before the machinery that carries it |
| 5 | **E — The main line** | Needs C to record and D to speak |
| 6 | **F — Side lines, gates, and eggs** | Needs E's machinery; this is where the volume lives |
| 7 | **G — The card** | Needs C's metrics to have anything to print |
| 8 | **H — The inward half** | Independent of all of it, and the right place to end |
| 9 | **I — The ghost tier** | Last, because it is the only thing here that is not observed, and it should be built on top of a product that is |

**Sound is not a phase.** It lands with whatever it belongs to: the descent
tone in B, the celebration strike in C, the landmark note in F, the silence
in H. See the sound section.

---

## Phase A — The map stops being empty  — **DONE 2026-09-17**

The map already knows far more than it draws. Fix that first.

- Ship the NRO delegation dataset — 291 KB gzipped, measured — deferred to the
  same trigger as the RIPEstat lookups, so arrive-copy-leave still talks to
  nobody but our own edge. `scripts/ip-build-space-field.py`.
- Inline the small tables immediately: IANA /8s, the 51 rows covering all of
  `2000::/3`, RFC 6890. A few KB, and the whole space names itself from the
  first frame.
- Every cell gets **era, registry and country**, drawn as computed values and
  not as decoration — if a mark's brightness cannot be explained by a number,
  it is wrong. Probably density and brightness rather than hue, to keep the
  three-colour rule.
- **Queries.** *Show me Brazil* (13,053 ranges). *Show me everything before
  1990* (4,546). *Show me AFRINIC.* *Show me Iceland* (174). *Show me the
  Vatican* (4, and that is genuinely all of it).
- **Exit:** a visitor can look at a region and know something about it before
  clicking, and can ask the map a question and watch it answer.

## Phase B — The descent becomes sublime

### Researched before building, 2026-09-17

**The orientation problem evaporates.** Each rung currently runs its own
local `d2xy` over its own container, so a child's internal layout does not
match the parent's implied sub-layout and the two cannot be made to agree.
Index every rung into **one global curve** instead — a cell's position is its
index in the whole space at that cell size, not its index within a container
— and nesting is exact with no rotation state carried anywhere. Verified:
`child >> 12 === parent` for every cell of a 64x64 window. This is the whole
technical risk of the phase and it is gone.

**A curve on a 2^k x 2^k grid needs an even cell length**, and every rung has
one: the anchors are 64 (v6) and 24 (v4), the step is 12, and even minus even
is even. Nothing to special-case.

**Cost: ~20 ms per rung, flat with depth.** One `d2xy` plus a 64x64 window of
`xy2d`, in BigInt, measured at orders 10, 16, 32 and 58 — all about the same,
because BigInt work under 2^128 costs about the same whatever the magnitude.
Three live rungs is ~60 ms on a rebuild, and rebuilds happen on rung
crossings and travel, never per frame. The tiled fast path considered earlier
is not needed.

**ZOOM must become 64, and this time it will work.** Setting it to 64 alone
was tried and made things worse — measured, 23px of disagreement became
147px — because scaling up an unregistered offset only magnifies it.
Registration needs the scale ratio AND the position: with every rung centred
on the aim in global coordinates, a child's whole field occupies exactly one
cell of its parent, which forces the ratio to be FIELD. Both halves or
neither.

**The convergence pan survives.** It becomes one rigid translation of the
whole stack rather than a per-rung correction, because translating every
layer by the same world offset preserves their alignment with each other.
The owner's model — the centre is not what you clicked until you get in far
enough — is unaffected.

**Powers of Ten sets the rate.** One order of magnitude per ten seconds,
constant, no cuts, the whole film a single camera move. Our axis is already
logarithmic, so constant axis velocity is already constant zoom rate. What we
lack is the *no cuts* part, which is precisely what registration buys.

### Researched before building the wonder half, 2026-09-17

Four findings, all load-bearing for how the outlines get drawn.

**Our condition has a name in the literature: desert fog.** Jul & Furnas,
*Critical Zones in Desert Fog: Aids to Multiscale Navigation* (UIST 1998),
define it as a view of an information world that contains no information on
which to base navigational decisions -- you zoom into a region and there is
nothing there to steer by. That is exactly the diagnosis from the open-world
research ("arriving somewhere reveals nothing to go to next"), arrived at
independently. Their prescribed aid is **cues integrated into the detail
view** rather than a separate overview, plus landmarks. The accumulated
outlines are that aid.

**Do not build a minimap.** Hornbaek, Bederson & Plaisant measured zoomable
interfaces with and without an overview: **80% of subjects preferred having
the overview, and were 22% slower with it** (68.76 s vs 84.23 s on multi-level
maps). Switching between the overview and the detail view correlated with
higher task time (r=.404, p<.001). **The cost is the switch, not the
context.** Context drawn into the scene keeps the thing people prefer without
charging them for it. This rules out an inset or corner overview for good.

**Powers of Ten uses ONE frame, not a stack.** The film's device is a single
thin white square marking the current field of view -- a viewfinder, not a
trail. It never accumulates. So accumulation is *our* departure from the
reference and has to earn itself: start with the immediate parent marked
clearly and the ancestors falling away, not N outlines of equal weight.

**Contrast is the only depth cue available to us, and it is enough.**
Occlusion is the strongest monocular cue but nested frames do not occlude one
another. Contrast attenuation -- aerial perspective -- reads as distance
**even when size opposes it** (Rohaly & Wilson, *Contrast as a depth cue*,
1994). So one mechanism, outline contrast falling with ancestry depth,
delivers recession and clutter control together. Keep it clear of the cell
fill: era is already brightness, and the two must not be confusable. Outlines
are line geometry; era is fill.

**The call this adds up to:** contrast-ramped nested outlines drawn into the
scene, immediate parent strongest, no minimap, no labels in the first cut.
Whether they need names is a judgement to make while looking at them, not
before.

### What to build

- Global-curve layout for every rung, replacing per-container `d2xy`.
- `ZOOM = FIELD`, with the rigid-translation pan.
- **The place you just stood becomes one cell of the place you are now** —
  and stays outlined as it shrinks, so the visitor can see where they came
  from rather than merely having been there.
- **The descent accumulates.** Containers already passed through leave their
  outlines behind, nested and receding. At rung eight the seven above are
  still on screen. This is Kant's tension made literal: successive parts,
  presented at once, that cannot be unified — which is the definition of the
  mathematical sublime rather than a metaphor for it.
- The descent tone from the sound section lands here.


The wonder work. This is the phase that makes the app feel like something
rather than read like something.

- **Layer registration** — the unbounded-Hilbert layout, global rather than
  per-container, with orientation carried down. Adjacent levels then overlay
  exactly and a cross-fade becomes a true level-of-detail blend.
- **The place you just stood becomes one cell of the place you are now.**
  Registration is what makes this possible and this is what it is for. Not
  "4,096 times larger" as a caption — watched, as it happens.
- **The descent accumulates.** At rung eight the seven above are still felt.
  The rail carries it now; it should carry far more.
- Free spatial panning falls out of the same work. Take it.
- **Exit:** someone pulls back through three rungs and says something out
  loud.

## Phase C — The notebook, and the noise it makes

- `localStorage`, same as the RIPEstat cache already uses. Nothing leaves the
  device, nothing to promise and then break.
- **Metrics, and they are a brag sheet.** Distance travelled. Networks
  entered. Countries crossed. Deepest descent. Oldest block found. Sites
  recorded. All descriptive, all yours, all sitting in a menu that can be
  ignored forever by anyone who does not care.
- **The celebration, and it is not subtle.** The mark ignites. The flare
  blooms and the floor catches it. A ring runs out across the field. A hard
  bright line of type. The guide says something. This is a good moment and it
  should feel like one.
- Register is a naturalist's — a logbook, sites recorded, survey lines — but
  that is a matter of *wording*, not of restraint. Life lists are a
  completionist's hobby and always have been.
- **The tracker** (see above) ships with this phase. It is the thing that
  makes an objective feel like an objective rather than a state variable.
- **Exit:** coming back tomorrow shows what you found today, and what you
  were halfway through.

## Phase D — Writing the guide

No code in this phase at all.

- Forty-odd lines **plus the cold open's branches**, drafted in one sitting,
  read aloud end to end, cut hard. The cold open is the highest-leverage
  writing in the product — it is where someone decides whether this is worth
  their attention — so it gets written first and revised last.
  Written before the machinery, because the writing *is* the product here and
  forty lines drafted together will be better than forty written one at a
  time against a UI.
- Character, rules and samples are in the guide section above. The short
  version: a surveyor who has been here for years, is delighted to have
  company, has favourites and grudges, celebrates properly, is sarcastic when
  a find is dull and then usually admits it is interesting anyway.
- **Do not reintroduce the restraint rules that four earlier drafts kept
  adding.** They produce something correct and joyless.
- **Exit:** read the forty aloud. If they are fun, build the rest. If they
  are not, the problem is the writing and no machinery will fix it.

## Phase E — The main line

The one line offered unprompted. It answers *where are you, actually* — not
geographically, structurally.

| # | beat | what it teaches | gate |
|---|---|---|---|
| 1 | your address, copied | it is a number, and it is yours | none; already built, five seconds |
| 2 | the block you are announced in | somebody speaks for you | 1 |
| 3 | another block your own network announces | **a network is not one range** | 2 |
| 4 | the registry territory you sit in | you belong to a region, and regions differ | 2 |
| 5 | the whole space, and its size | scale, and IPv6's real depth | 4 |
| 6 | inward: what your visit revealed | the instrument turns around | 1 |
| 7 | the boundary: where our sight stops | **your address is not you** | 6 |

- The guide offers the next beat once, then lets it lie. The notebook keeps
  it if the visitor wandered off mid-sentence, which they will.
- Entirely ignorable. Two-thirds of Skyrim players never finish the main
  quest and the game is not diminished by their wandering off to do crimes.
- **Exit:** someone who follows it learns that routing is not geography by
  finding it, not by being told.

## Phase F — Side lines, gates, and the ones nobody was told about

Where the volume is. **Many side lines — thirty to begin with and no ceiling
— and several are open at the same time.** The notebook holds them all the
way a quest journal does: you can be three sites into one, one site into
another, and have never noticed a third. None of them block any other. The
count of open lines is itself a reason to keep going, and phase D's format
means the thirtieth is no harder to add than the third.

Each line is a chain of two to four sites, and every one is true.

**Side lines — offered once you are near.**

- *The oldest hands* — `192.5.21.0`, 13 December 1982, the oldest record that
  still exists; then the /8s handed whole to single organisations in 1983,
  1988, 1990.
- *The addresses that can never be used* — `240.0.0.0/4`, the TEST-NETs,
  `2001:db8::/32`.
- *The thirteen* — the root servers, a to m, both families.
- *Where the map is wrong* — registered in one country, announced from
  another. The one that fixes what most people have backwards.
- *The quiet ones* — allocated decades ago, never announced.
- *Small countries, old space* — Singapore 66% pre-1993, Japan 8.6%, the
  Vatican's four ranges.

**Gated lines.** Real gates, not arbitrary locks: you cannot find a block
announced from the wrong continent *strange* until you have watched an
ordinary network's footprint stay put. So *Where the map is wrong* needs *a
network is not one range* first. The prerequisite exists because the lesson
depends on it.

**Optional depth.** The deepest IPv6 rungs, the descent through your own /64.
Offered, never pointed at. Anyone who goes looking finds them.

**The doors — from IPv4 into IPv6 and back.** Owner's request, 2026-09-17,
and it is the best egg available because it is entirely true and it is a
genuine *wait, that cannot be right*: **your IPv4 address already exists
inside IPv6, at an address anyone can compute.** Four real doors, all defined
by RFC, all pure arithmetic on the number the visitor arrived with:

| door | where 193.0.6.139 comes out | what it is |
|---|---|---|
| NAT64, `64:ff9b::/96` | `64:ff9b::c100:68b` | the whole of IPv4 embedded in IPv6 so the two internets can speak |
| IPv4-mapped, `::ffff:0:0/96` | `::ffff:c100:68b` | how an IPv4 address looks to an IPv6 socket |
| 6to4, `2002::/16` | `2002:c100:68b::/48` | a bridge built between them, then abandoned |
| Teredo, `2001::/32` | inside `2001::/32` | IPv6 smuggled through IPv4 |

- Walking through one **changes which address family the whole instrument is
  surveying.** The ladder re-derives at the new family's depth, so an IPv4
  visitor who finds the NAT64 door steps from a 2.67-step axis onto a
  10.42-step one, at the point corresponding to where they were standing.
  That is the size gap delivered as an event rather than a sentence.
- The way back is the same arithmetic in reverse, and finding the door from
  the far side is its own small pleasure.
- 6to4 is the one with a story: a door that was built, used, and abandoned.
  It should look abandoned.
- Gating: offered only once the visitor has seen both families exist —
  main-line beat 5 — or found by anyone who wanders into `64:ff9b::/96`
  without being told, which is the better way to find it.

**Other eggs.** Nobody is told. `127.0.0.1`. The documentation prefix that is in
every textbook on earth. Going as deep as the ladder allows. **An egg opens a
line that was not in the notebook until it appeared** — the one mechanic here
that can genuinely surprise someone on their second visit.

- **Completion count over the marked sites.** Forty is an honest denominator:
  it counts what we marked, the way a life list counts species without
  claiming the world is small.
- **Exit:** two people who explored differently have different notebooks, and
  one of them knows about a line the other has never seen.

## Phase G — The card

- The notebook exported as an image: canonical still, plate, trail, metrics,
  redaction on by default.
- **This is how you beat your friend.** No leaderboard, because there is no
  server and *seen for this response, not kept* is the spine of the product.
  You export it and show them, which is what people do anyway.
- **Exit:** the image is truthful, legible, gives nothing away unasked, and
  somebody wants to post it.

## Phase H — The inward half

The instrument turns around, and the product ends where it should.

- I1 what reached the edge. I2 what stayed in the browser. I3 the fingerprint
  sentence. I4 the boundary. Privacy audit first, copy written from it.
- **Informs rather than alarms.** Fear appeal is the cheapest available win
  here and taking it would make this a worse product. Show how little was
  kept and let the relief be the payoff.
- **Exit:** the difference between the two strata is understood, and the
  ending lands.

## Phase I — The ghost tier

**Restored 2026-09-17.** The owner chose this explicitly on 2026-09-16 and a
draft of this plan cut it on tidy-sounding reasoning: that phase A proves the
space was never empty and phase F supplies real things instead. True of
shallow space. **False of deep space**, which is where this was always for —
eight rungs down an IPv6 descent there is genuinely nothing, and nothing is
all there will ever be.

The rule it exists to express is still the best visual idea in this project:

> **Real things cast light and have a reflection. Imagined things are line
> drawings that the floor refuses to acknowledge.**

- Four grades of truth: **measured** (our edge saw it), **answered**
  (RIPEstat replied), **derived** (registry arithmetic, no lookup, still
  true), **imagined** (generated).
- Ghosts are **networks, not terrain**, and carry **no invented names or AS
  numbers** — both owner decisions from 2026-09-16 and both still right.
- Seeded by the address, so the same empty place generates the same ghost
  for everyone, forever. An IPv6 address is 128 bits; No Man's Sky runs on a
  64-bit seed. The space is not short of seeds.
- Shaped by real distributions from the `ris-asns` data that
  `scripts/ip-build-asn-field.py` already fetches, so a ghost is a plausible
  inhabitant rather than noise.
- **Deep rungs only.** Where the registry has something to say, it says it.
  Ghosts appear where there is nothing and nothing is the truth.
- **Exit:** a visitor can tell at a glance, with no caption and no
  explanation, which things on screen were observed and which were imagined.

---

## Cut, and why

- **Phase 6's ASN population horizon.** Absorbed by phase A, which gives the
  wide view real structure from better data.
- **Leaderboards and rank.** Architectural, not aesthetic: no server.
- **True layer registration is NOT cut, and is no longer filed as polish.**
  See the wonder section: it is what lets the visitor watch the place they
  just stood become one cell of the place they are now, which is the
  mechanism of perceived vastness. It was deferred twice as a 6px cross-fade
  artefact; that judged the artefact correctly and the stakes wrongly. **It
  is phase B.** It is not deferred a third time.

## Still open

- *(Resolved 2026-09-17: the ghost tier is back, as phase I, deep rungs
  only. Sound is in, synthesised, distributed across the phases.)*

- Whether phase A alone is enough. **Build it and stop** before committing to
  B-F. It is a day's work and it tests the whole premise: if being able to
  ask for Brazil and watching 13,053 ranges light across the map does not
  feel good, nothing after it rescues that.
- The exact visual language for era and country without breaking the
  three-colour rule. Probably density and brightness rather than hue.
- **Write the guide's lines before building the machinery that carries
  them.** Not out of caution — because the writing is the product here, and
  forty lines drafted in one sitting will be better than forty written one at
  a time against a UI. Everything else in phases C and D is plumbing for it.
