# Making it worth exploring — what the research says

Researched 2026-09-17, after the owner asked whether this is heading in the
direction of Skyrim or No Man's Sky. The honest answer at the time was
*structurally yes, experientially not yet*, so this is the research into
what closes that gap.

Companion to `docs/ip-plan-v2.md` §"Beauty and wonder", which covers awe and
the sublime. This one covers the other thing, which is not the same thing:
**wanting to click the next one.**

---

## 1. The triangle rule, and the part everyone forgets

Breath of the Wild's terrain was designed as triangles, and Fujibayashi and
Yonezu sorted them by size:

- **Large** — landmarks. Visual markers you navigate by.
- **Medium** — *they obstruct the view.* They exist to hide what is behind
  them, so the player wonders.
- **Small** — tempo. They change what you are doing moment to moment.

The medium ones are the ones that get left out of every summary, and they are
the ones doing the work. **Obstruction is a feature.** You go over the hill
because you cannot see past it.

Alongside them Nintendo used what they called **gravity**: the deliberate
placement of smaller things *between* the towers, so players get side-tracked
on the way. They heat-mapped where testers got bored and moved things there.
Their first attempt put towers everywhere as obvious cues and testers
disliked it. **The distraction on the way is the design, not a failure of it.**

### What transfers, and what does not

**This app is a map, not a landscape, and maps do not occlude.** Everything
in the field is visible at once by construction, and that is correct — hiding
real data would be the map lying, which §"lit = known, dark = unasked"
already forbids. So the medium triangle does not transfer literally and
should not be faked with a fog overlay.

What does transfer is the *principle underneath* it: **something must be
withheld or the eye has no reason to travel.** We already have the honest
version of that and have not exploited it. Lit = known, dark = unasked is a
fog of war made of real epistemics. The problem is not that we lack fog. It
is that **our fog is uniform and promises nothing.**

## 2. A landmark is a different KIND of thing, not a brighter one

From the level-design literature, consistently: a landmark — "dominant",
"focal point", or in Disney Imagineering's term a **wienie** — is *a unique
element of the architecture that stands out from the composition.* Its job is
two-fold: orient the visitor, and entice them.

**We draw landmarks as points, which is what we draw everything else as.** A
landmark is currently a cell with a higher intensity and a larger sprite
(`marksInField`, `lm[i]`). Under this research that is the wrong axis:
brightness is a *degree*, and a landmark needs to differ in *kind*.

The art direction already gives us four materials — points, hairlines, rimmed
surfaces, and ground light pools — and landmarks currently use one of them.
Giving a landmark a rim and a pool would make it read as a **thing** rather
than a bright dot, at no cost to "geometry accountable to the data", because
being a landmark is itself a fact about the block.

This also lines up exactly with the four grades of truth already planned for
the ghost tier: *real things cast light and have a reflection.*

## 3. Landmark to landmark is the whole loop

The navigation model the literature describes: **on reaching a dominant, the
visitor should be able to see several new dominants from it.** That is beat
four of our own open-world loop, arrived at from the other direction.

We have exactly one mechanism that does this and it was built by accident:
**the network footprint.** Arrive somewhere and every other block that
network announces lights up. From Akamai that is 3,953 places. The internet's
own topology supplies the level design and nobody has to author it.

**But it only fires when the network is big.** Land in a network with one
prefix, or in space nobody announces, and arriving reveals nothing — which is
the majority of the map. The loop terminates exactly where the space is most
empty, which is the worst possible place for it to stop.

**Denial spaces** are the refinement: paths that deliberately lose sight of
the landmark, so arrival is more rewarding. We get this free on the axis —
a thing you are travelling toward genuinely leaves the frame at some rungs —
and we currently treat that as a defect rather than using it.

## 4. No Man's Sky: procedural breadth cannot carry it

The standing criticism — *wide as an ocean, shallow as a puddle* — is
specifically that procedurally generated worlds **lack the unique treasures
and sights that make exploring fun**, and that procedural variation is
surface-level: many variants of one thing rather than many things.

This is the sharpest warning available to us, because **our data is
structurally identical to procedural content**: 240,660 ranges, each with a
registry, a country and a year, arranged by an algorithm. It is *true*, which
is better than procedural, but truth alone does not make it varied. A /24 in
Brazil and a /24 in Sweden currently differ by two letters and a brightness.

What Hello Games actually did about it, across updates, was two things:

1. **More variety in kind, not in degree** — new biome types, not more
   colours of the existing ones.
2. **The Discovery Page.** Overhauled and expanded to show what you found in
   detail, with naming and cataloguing as a first-class activity.

The second one matters most for us, because **we just built it.** The
notebook is our discovery page, and this research says it should hold more
than counts — the actual things found, with their detail, worth returning to.

## 5. What this adds up to for this app

**The diagnosis is beat one.** Movement works, and arrival reveals more only
sometimes. Nothing on screen says *go there* — every cell is the same shape,
and the brightest ones are merely the oldest.

Three design consequences, in the order they would pay off:

**1. "From here you can see" — a sightline set at every arrival.** Two or
three *named, reachable* things computed from real data, offered on every
arrival rather than only when the network is large. Candidates that cost
nothing to author: the nearest landmark; the oldest block in view; the
largest run held by nobody; the nearest block from a different registry. This
is beats one and four together, it works in empty space, and it is the single
highest-value thing on this list.

**2. Landmarks get their own material.** Rim and pool, not a brighter point.
A landmark should be identifiable as a landmark before you can read its name.

**3. Allocated but never announced is the mystery worth pointing at.**
Somebody owns it and nobody routes it. It is strange, it is true, it is
already in `space.bin`, and it is a question with an answer — which is
exactly the "obscure event that turns out to be reasonable" that the awe
research named as the strongest form of accommodation.

**What this research does not support:** a fog overlay, procedural terrain,
invented landmarks, or any attempt to make the map occlude itself. The
withholding has to stay honest, because the honesty is the product.

---

## Sources

- [The Design Secrets of Breath of the Wild](https://80.lv/articles/the-design-secrets-of-breath-of-the-wild)
- [Breath of the Wild's design is all about triangles](https://www.nintendolife.com/news/2017/10/zelda_breath_of_the_wilds_ingenious_design_is_all_about_triangles_apparently)
- [Landmarks in Level Design](https://level-design.org/?page_id=2261)
- [Open World Game Design: Pacing, Points of Interest, and Player Freedom](https://www.strayspark.studio/blog/open-world-design-pacing-player-freedom)
- [Development of No Man's Sky](https://en.wikipedia.org/wiki/Development_of_No_Man%27s_Sky)
- [No Man's Sky — Beyond Update](https://www.nomanssky.com/beyond-update/)
- [The Art and Science of Fog of War Systems in Video Games](https://www.designthegame.com/learning/tutorial/the-art-science-fog-war-systems-video-games)
