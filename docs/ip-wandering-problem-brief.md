# The wandering problem — a brief for outside review

**Written 2026-09-18.** This document is self-contained. You do not have the
codebase and you do not need it. Everything required to give a useful answer
is below, including the fences you must design inside.

**What we want from you is in §7.** Please read the constraints first — they
are the reason the obvious answers are not available to us.

---

## 1. What the product is

A "what's my IP" page that is also an explorable map of the internet's
address space.

Your public address appears in the first frame, read from our own CDN edge —
never from a third-party lookup. Behind it is a **continuous zoom axis** you
pull with the wheel: from your own address, out through the block that
announces it, out through progressively larger containers, to all of IPv4
(or the IPv6 equivalent, which is a much longer axis). You can also **travel**
— click a cell and your aim moves there.

The address space is drawn as a **Hilbert-curve field**: 4,096 cells per
view, one global curve, so every zoom level registers exactly with the one
above it. A cell's brightness encodes **allocation age**; unallocated space
is the darkest thing on screen. Colour has exactly three roles: cream is what
you are being told, cold blue is structure that is not you, and **amber is
you, and nothing else, ever**.

It is rendered in raw WebGL2 with HDR accumulation, a bloom chain and a tone
map. It is dark, quiet, and has very few marks in a lot of space. It is
explicitly **an instrument, not an illustration** — a surveying instrument
with a fixed chassis (ground plate, polar reticle, tick scale, plumb axis)
drawn identically at every scale, which is what makes many zoom states read
as one place rather than many screens.

There is a **narrator** — a surveyor who has spent years here; dry, sometimes
sarcastic, occasionally unguarded. There is a **notebook** in localStorage
recording every place you have been. There is a **celebration** when you
reach a named place for the first time. There is written quest content —
nine chains, twenty-nine beats — that is loaded but not yet wired to
anything.

It is intended to feel like wonder. The owner's original bar: *"It is
supposed to look better than pictures."*

---

## 2. The problem

The owner built this. After several days of actually wandering the live site,
they said:

> **"It just feels undirected. I feel like there isn't much value in
> exploring."**

That is the whole problem. Everything below is an attempt to state it more
precisely.

### The four-diagnosis test, and its result

They were offered four possible readings and asked which were true. **Three
of four were confirmed:**

| # | diagnosis | verdict |
|---|---|---|
| 1 | **"I don't know where to go."** | **TRUE** |
| 2 | **"I go somewhere, and then nothing happens."** | **TRUE** |
| 3 | **"It's beautiful, but it isn't a game."** | **TRUE** |
| 4 | "I know where to go, but I don't care." | **FALSE** |

**The fourth is the important one.** The owner first named it as the false
one, then immediately corrected themselves:

> *"Sorry it is only untrue because I don't know where to go. Sure maybe
> private IP space or the brighter orbs, but that is really all."*

So #4 is **not** evidence that motivation is fine. It is untestable, because
#1 is true. You cannot learn whether somebody would care about a destination
they cannot see.

That correction also contains the most damning fact in this document, and it
is easy to read past: asked to name everywhere they might want to go, **the
person who built the thing named two** — *private IP space*, and *the
brighter orbs*.

### What was measured afterwards

Not guessed. Sampled on the live site:

```
axis 0.00 – 0.50    no suggestions at all     <- home and the block view
axis 0.75 – 2.00    "Root server K · the oldest here, 1993"
axis 2.25 – 2.50    "Root server E · the oldest here, 1983 · 512 in a row…"
```

- **There is no direction at all for the first quarter of the axis** — which
  is home, the block view, and the first minute of every single visit.
- Across **eight** sampled axis positions, the suggestion engine produced
  **essentially one repeated suggestion.**
- The map's **entire visual vocabulary of destinations is brightness.** Every
  cell is the same dot. Only brightness differs, and brightness means age.
  There is no other visible difference between one region and another, at any
  scale.

### The loop this is supposed to be, and where it breaks

The design target is the ordinary open-world loop. It was adopted after the
owner rejected an earlier "the payoff is the return" framing — people go
**on**, not back:

> **1. See something from where you are standing → 2. go to it → 3. get
> something → 4. from the new position, see the next thing.**

**Beat 2 works.** Travel is instant, honest and pleasant.

**Beat 1 is broken.** For the first quarter of the axis there is nothing to
see, and after that the map has two legible kinds of place.

**Beat 3 is broken.** Arriving produces a plate of facts, sometimes a
narrator line, and a notebook entry. The owner's word for this was
*"nothing happens."*

**Beat 4 cannot happen**, because beat 4 is beat 1 again.

Our reading is that beat 1 is the root and beat 3 is a second, independent
fault. **We would like you to tell us if that is wrong.**

---

## 3. Hard constraints — the fence

These are not preferences. Each was decided by the owner, several of them
after rejecting an implementation that violated them. **A proposal that
breaks one of these is unusable to us**, however good it is otherwise.

If you believe one of these constraints is itself the cause of the problem,
say so explicitly and argue it — that is a legitimate and welcome answer.
What is not useful is quietly designing past one.

**1. The geometry must remain accountable to the data.**
Every position and every brightness on screen is computed from a real number
by a rule statable in one sentence. *If a mark cannot be explained by a
number, it is removed — not restyled.* Two earlier art directions were
rejected outright for inventing a geometry and hanging data on it. **No
decorative particles, no ambient shimmer, no procedural terrain, no invented
landmarks, no colour ramp that encodes nothing.** Motion explains a change of
scale or subject; nothing decorates idle time.

**2. Lit = known, dark = unasked.**
Brightness means *we asked and got an answer*; dark means *nobody asked*. A
fog-of-war overlay has already been considered and **rejected**: the
withholding has to stay honest. We cannot hide real data to manufacture a
discovery mechanic, and we cannot invent data to fill a void.

**3. Amber is only ever the visitor.**
Three colour roles, no more. A fourth colour is a change to a locked
decision. Travel away from your own address and there is **no amber anywhere
in the frame** — that absence is what makes the stated distance mean
something.

**4. The camera belongs to the hand holding it.**
A click moves the aim and **nothing else**. No fly-to, no auto-centre, no
snap-to-state, no re-framing when late data arrives. **This was rejected
three separate times** and is the most-corrected decision in the project.
Any proposal containing "and then the view moves to…" is dead on arrival.

**5. No third-party lookups, no server, no accounts.**
There is no backend. State is `localStorage` only. **No leaderboards, no
social features, no "visitors who went here also went there."** This is
architecture, not taste. The address itself comes only from our own edge.

**6. The narrator obeys the same evidence rule as the renderer.**
He may say: (a) what the instrument looked for and found, or did not find;
(b) what he likes or dislikes; (c) the overwhelmingly likely reading of a
record already on screen, phrased as inference; (d) hyperbole nobody could
mistake for data. **He may not carry a quantity in his "I"** — no "most of
these are…", no "there's a lot of…". A renderer that refuses to guess,
narrated by someone who guesses freely, is one product lying to itself.

**7. Do not solve this by removing the enjoyment.**
Four separate drafts tried to trim celebrations, counters, badges and the
narrator's licence to exclaim, on grounds of taste. The owner reversed all
four. Restraint is not the answer here, and proposing it will be read as the
fifth attempt.

**8. No fear appeal.** No "WE KNOW WHERE YOU ARE", no privacy scare, no
uniqueness score, no shield icons. The product informs rather than alarms.

**9. Also banned, for completeness.** No globe, world map, coastline or
geography of any kind. No `border-radius`, `box-shadow` or `backdrop-filter`.
No modal, tutorial, onboarding or consent wall — **nothing optional may ever
appear in front of the address**. No animated packets, no fake traceroutes,
no line described as a cable. No exclamation marks. No emoji.

**10. Mobile is not currently a first-class target.** Hover is assumed.

---

## 4. What already exists, that a fix can be built from

Please prefer proposals buildable from this. **If your idea needs data we do
not have, say so explicitly** rather than assuming it is available.

**Per-cell data, shipped locally (439 KB, no network).** For every allocation
in both address families: the **registry** (ARIN, RIPE NCC, APNIC, LACNIC,
AFRINIC), the **country code**, and the **exact year of allocation**.
Unallocated space is identifiable as such.

**Per-address data, on demand.** The announcing network's AS number and
holder name, the announced prefix, and how many prefixes that network
announces. This arrives from a live lookup a beat *after* you move, so it
cannot be relied upon for the first frame.

**26 hand-written landmarks**, each with a name and a sentence: the private
ranges, loopback, link-local, carrier-grade NAT, multicast, broadcast,
TEST-NET 1/2/3, benchmarking space, `240/4` (reserved in 1981 for a future
that never arrived, still empty), the public resolvers (8.8.8.8, 1.1.1.1,
9.9.9.9), NAT64, Teredo, 6to4, unique-local and documentation space — plus
the thirteen root servers.

**A notebook**, in localStorage, recording every place visited: prefix, visit
count, AS number, holder, country, allocation year, and whether it was
announced. Plus the set of countries seen and the oldest allocation found.

**A suggestion engine** ("from here you can see"), which offers up to three
computed destinations: the nearest named landmark, the oldest allocation in
view, and the largest contiguous run of unallocated space. It excludes
anywhere you have already been. **This is the thing that was built to fix
beat 1, and did not.**

**A narrator**: 126 written lines across 42 situational buckets, a scheduler
that keeps him quiet while you travel and speaks roughly once a minute
otherwise, and a persistent off switch. The owner has separately confirmed
from real use that **his cadence is right — he does not talk too much.**

**A celebration**, about 1.15 seconds: the mark ignites, the floor catches
the light in a pool, a ring runs outward, a hard line of type names the find,
and a note sounds. It fires **only for a named place never recorded before.**

**Nine written quest chains, twenty-nine beats — loaded, and not yet wired to
anything.** Seventeen of those beats are *find* rules that would resolve
against live data rather than fixed addresses: "another prefix the same
network announces", "a prefix whose registered country differs from its
origin network's", "the oldest thing here". The writing exists. The engine
that would let a visitor be *in the middle of* one does not.

---

## 5. What has already been tried, and failed

**The suggestion engine was built specifically to fix beat 1.** It passed
every check we wrote for it. It shipped. The owner then wandered for several
days and reported the problem unchanged — and the measurements in §2 explain
why. It is invisible for the first quarter of the axis, and its three rules
collapse to roughly one answer in practice: the nearest landmark is usually
the same landmark, and the oldest allocation in a wide view is the oldest
allocation in every wide view.

**The lesson we took from that, and would like you to hold us to:** a feature
that passes its own tests can still fail its purpose. *"I built the thing
that fixes X"* is a claim about mechanism, not about X.

**A half-built "earned lenses" idea** — filters the visitor unlocks by
exploring — was started against a diagnosis the owner then corrected, and
abandoned unfinished. Treat it as a discarded sketch rather than a direction.
If you think it was actually right, say so.

---

## 6. Our current theory, which we would like you to attack

**Territories.**

The observation: the map's destination vocabulary is one dot repeated four
thousand times, varying only in brightness. But **every cell already carries
a registry and a country**, and adjacent cells that differ in either form a
**border** — a border genuinely present in the data, requiring nothing
invented. Hairlines are already permitted visual material.

Drawn, this would turn a uniform dot field into a map with **shapes at every
scale**: continent-sized registry blocks at the widest view, country blocks
further in, and the ragged edges where they interleave. Somewhere to point
at, without a word of text.

Two smaller fixes would follow: suggestions present from the very first
frame, and suggestions that actually vary.

**This is a theory. It is not built and it is not approved.** It would be the
most visible change to the art direction since the renderer was written.

**Please argue against it.** Specifically: does it fix beat 1, or does it
merely make the field prettier? Does a border tell you anything about whether
a place is *worth going to*? And does it survive the three-colour rule
without turning into a political map — which is banned, and which would also
be a lie, since these are administrative allocations and not territory in any
meaningful sense?

---

## 7. What we are asking you for

Please answer **structurally**. We have learned that line-level critique
produces opinion and structural critique produces bugs. If you think the
framing in this document is wrong, saying so is the most valuable thing you
can do.

**1. Is the diagnosis right?**
Is the root cause beat 1 (nothing to see), beat 3 (arriving gives nothing),
both independently — or something neither of us has named? If you think the
real problem is something else entirely, say that first, and say why.

**2. Beat 1 — what is the smallest change that makes the map legible as a
place with destinations in it?**
Constraints: computed from registry, country, year, allocated-or-not, and the
26 landmarks. Nothing invented. Must work from the very first frame, at every
scale, and without text.

**3. Beat 3 — what should arriving actually give you?**
This is the part we understand least. The visitor travels somewhere and
receives facts, sometimes a narrator line, and a notebook row. The owner's
word was *"nothing happens."* What is the honest version of a reward here,
given no server, no accounts, no leaderboard, nothing invented, and nothing
that condescends? Note that the quest chains exist and are unwired — tell us
whether wiring them up **is** the answer to beat 3, or merely looks like it.

**4. Attack territories.** See §6.

**5. Where has this problem already been solved, and what was the actual
mechanism?**
We want specific mechanisms, not genre references. If a game, an atlas, an
observatory, a museum or a map has solved *"make a uniform field legible as a
landscape with destinations in it"*, we want to know **what they actually
drew or did** — and whether the mechanism survives our constraint that
nothing may be invented.

**6. What are we going to get wrong?**
Given the fences in §3 and the failure in §5, what is the most likely way our
next attempt fails? What would make us believe we had fixed this when we had
not?

---

### One last note on evidence

The only test of this that has ever been run by a human is the owner
wandering for several days, and it failed. Every automated check we have
passes. Please weight accordingly: **we are not looking for something that
passes a review. We are looking for something that would change what that
person experienced.**
