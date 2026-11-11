# What is left, and in what order

Written 2026-09-18. **This is the plan of record for remaining work.**
`ip-plan-v2.md` stays authoritative for what each phase *means* — the guide's
character, the content format, the sound rules, the ghost tier — and this
says what actually gets built next and why in that order.

It exists because the v2 build order stopped describing reality. Work went
out of order for a good reason: the owner asked whether the story was right
before there was machinery to carry a voice, so the writing got done first.
That was correct and it means the phase letters no longer line up.

---

## THE DIRECTION — owner, 2026-11-11

> *"It should be an exploration type of thing but it should be useful first
> before anything."*

**Useful first, then exploration.** Every visit is a what's-my-IP visit
before it is anything else. The first frame answers the questions people
came with, in one glance, and only then offers the way in. Exploration is
the product's depth, not a toll in front of the answer.

What that means for ordering, from here:

1. **The useful layer — DONE 2026-11-11, not deployed.** Address with a
   visible label; approximate location, internet provider and address type
   from our own edge; a plain "Explore the internet around this address"
   control with a one-line how-to. Nothing covers the amber mark — the
   answer measures where it is and moves out of the way.
   *(Deployed since: iphere.app. Then, 2026-11-11, approved as "Let's do all
   3": the errand, early, and the doors `/ipv6/` `/isp/` `/private/` - DONE
   on `claude/peaceful-feynman-p7r37j`.)*
2. **Then: the map has to show where to go.** **APPROVED 2026-11-11** (owner:
   *"Let's do all 3"*) - territories and sightlines from the first frame.
   **BUILT 2026-11-11 on the branch, preview only.** Borders where the
   registry changes (strong) or the country, or held/unheld (fine, dropped
   when too fragmented to read); sightlines from home onward, with "<country>,
   next door" and "where <registry> begins" from across the nearest border,
   never a country or registry already stood in. The diagnosis from 2026-09-18
   still stands — the map's only destination vocabulary is brightness and
   the sightlines are hidden for the first minute. Territories plus
   sightlines from the first frame is the fix. The chain engine below puts words on a map that
   does not yet show places; I think direction comes first.
3. Then the chain engine, the doors, the card, the inward half, the ghost
   tier, as below.

---

## Where it actually is

**Live:** phases 1–4.5, A, B, and most of C. The address, the renderer, the
ladder, travel, landmarks, the registry layer, the query layer, registration
and the container you came out of, the descent on the rail, the descent tone,
the notebook and its metrics, the sightline chain, and the celebration.

**Live but doing nothing:** the writing. 126 guide lines are loaded, picked
and spoken. **Nine chains and 29 beats are loaded and never read** —
`CONTENT.chains` is referenced in exactly two places, the loader that fills
it and the probe that counts it.

**Not built:** everything that turns those chains into something a visitor
can be *in the middle of*.

### The structural change since v2

**E and F have become the same work.** v2 treats them as separate phases —
the main line, then side lines and gates — but both their content now exists
and both need one engine: chain state, beat matching, advancing, and a
tracker. Build it once and both phases become rows in a file, which is what
the content format was for. **C's tracker moves here too**, because its
objection — that it tracked objectives which did not exist — has expired.

---

## 1. The chain engine — **BUILT 2026-11-11** (owner: *"can you work on wiring up the stories"*), preview only

As built: `js/29-chains.js`. Each beat carries a `rule` (the test) and a
`goal` (the tracker's line) in `content/lines.json`; the rules are listed in
that file's `_rules`, and the linter rejects an unknown rule or a missing
goal. Beats a visitor cannot reach (the other family, the inward half) are
skipped, and a chain with fewer than two reachable beats is not offered -
so an IPv6 visitor gets four lines and an IPv4 visitor seven. Side lines
are offered as a named destination in "From here you can see" when their
next place is in view. Finishing a line with `grants` applies its lens at
once. NOT VERIFIED: whether any of it is fun - that needs somebody
wandering, as below.

### What it was planned as

Absorbs v2's E, F's machinery, and C's tracker.

**Why first:** it is the only thing standing between a large amount of
finished writing and a visitor ever seeing it. Nothing else unlocks as much.

- **1a. Chain state in the notebook.** `{ lineId: { beat, done } }`, same
  `localStorage`, same forward-compatible merge. The notebook currently
  records places and nothing about progress.
- **1b. Beat matching.** Two kinds. A fixed `at` is an equality test and is
  trivial. **17 of 29 beats are `find` rules, 16 of them distinct**, and that
  vocabulary is the real work of this phase. Roughly half are already
  computed by the sightline engine — nearest landmark, oldest here, largest
  run nobody holds — and the rest are new: *another prefix the same network
  announces*, *the same letter in the other family*, *a prefix whose
  registered country differs from its origin network's*.
- **1c. Advancing.** The beat's `say` fires at rank 1, the last beat triggers
  the reveal and the celebration, and the chain is marked done.
- **1d. The tracker.** One quiet line with the current objective. Three modes
  — full, minimal, hidden — remembered. **Crossed-off is kept and visible**;
  never cleared.
- **Gates.** `needs[]` is already in the data and is honoured here.

**Ship seven chains, not nine.** *The boundary* needs the inward half and
*Sold, and given back* rests on a record that is merely consistent with the
story it tells. Both are marked `provisional` in the data and the linter
reports them on every run.

**Exit:** the main line is playable end to end, and somebody who wandered off
halfway can tell in one second what they were in the middle of.

## 2. The doors

v2's egg, unchanged and still the best one available: your IPv4 address
already exists inside IPv6 at an address anyone can compute. Four doors, all
RFC-defined, all pure arithmetic on the number the visitor arrived with, and
walking through one re-derives the whole ladder at the other family's depth.

**Why here:** small, self-contained, needs nothing from phase 1, and it is
the strongest single moment in the product that is not yet built.

**Exit:** an IPv4 visitor who finds NAT64 steps onto a 10.42-step axis at the
point corresponding to where they were standing, and can walk back.

## 3. The card — v2's G

The notebook exported as an image. Every input already exists.

**Exit:** the image is truthful, legible, gives nothing away unasked, and
somebody wants to post it.

**Carried forward from the mobile decision:** the share path is where "a dumb
phone version" stops being free. This is the phase that forces that question.

## 4. The inward half — v2's H

The instrument turns around and the product ends. **Informs rather than
alarms** — fear appeal is the cheapest available win here and taking it would
make this a worse product.

**Unblocks *The boundary***, which is written and cannot ship until this
exists.

**Exit:** the difference between what crossed the wire and what stayed is
understood, and the ending lands.

## 5. The ghost tier — v2's I

Last, deliberately: it is the only thing in the product that is not observed,
and it should be built on top of one that is. Deep rungs only, ghost
*networks* not terrain, **no invented names or AS numbers**.

---

## Running alongside: the debt

Not a phase. Each is small, none blocks the others, and they should be picked
up between the numbered work rather than saved for a cleanup that never comes.

| | |
|---|---|
| **The whole-IPv4 view renders hot** | Density rather than shrinkage, so the `layerLight` fade does not touch it. `buildSpace` has never used `spread()`, which is a standing violation of invariant #2. One attempt was reverted for breaking reference state R3. |
| **The block renders hot at some scales** | Long-standing, reduced, not solved. |
| **Cross-fade residual** | Unquantified. Believed to be the sub-cell reference frame. **NOT VERIFIED.** |
| **Verification debt** | Postel's eight-of-twelve, the 2011 ceremony, AS7007, MIT's sale — each still rests on a single search. They are not shipped yet. They must not ship without a second source. |
| **Mobile** | Owner's decision: not a first-class target. Hover is assumed, pinch is not implemented. Phase 3 forces this. |

---

## What I cannot judge, and neither can a linter

Stated here because it is the largest risk left and it does not look like one.

The scheduler is tuned to numbers I chose: **55 seconds** between ordinary
lines, **one second** of silence after the axis moves, **4.2 seconds plus
reading time** on screen. Those survived a smoke test. They are guesses.

Nobody has yet answered, from actually wandering:

- Does he talk too much, or too little?
- Does the celebration land, or read as a pop-up?
- Does the writing survive being read at speed instead of on a page?
- **Does anybody click the thirty-fifth block?**

Every one of those is worth more than the next feature, and none of them can
be measured from here. **The single highest-value thing available is an hour
of somebody wandering and saying what felt wrong.**

---

## The order, in one line each

1. **The chain engine** — the writing becomes playable. Biggest unlock.
2. **The doors** — the best unbuilt moment, and cheap.
3. **The card** — the thing people show each other.
4. **The inward half** — the ending, and it frees *The boundary*.
5. **The ghost tier** — last, on top of a product that is observed.

Standing rules, unchanged: one phase then stop and show it; deploy is
human-run; presence in a plan is not approval to build it.
