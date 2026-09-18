# Two readers, one set of words

Written 2026-09-18, at the owner's instruction: it has to make sense to
somebody who arrived knowing nothing — possibly sent here by a friend — and
it has to be worth reading to somebody who has spent thirty years in this,
**without making that second person feel like a teenager is explaining
retirement to them.**

That phrase is the whole brief and the rest of this is how to keep it.

Governs every word in the product: the plate, the guide, the about panel, the
notebook. Companion to `docs/ip-guide-voice.md` (his character) and
`docs/ip-emotional-design.md` (the arc).

---

## 1. What each reader is actually lost by

They are not opposite problems, which is what makes this solvable.

**The newcomer is not lost by jargon.** They are lost by a term that is never
cashed out — a word that arrives and stays abstract. A word attached to a
thing they can see is not a barrier, it is a label.

**The veteran is not lost by simplicity.** They are lost by:

- **inaccuracy** — a simplification that is actually wrong,
- **approximation** — "about", "a kind of", "basically",
- **being told what they came in knowing**, in a tone that assumes they did
  not,
- **avoidance** — the real word swapped for a soft one, which reads as either
  ignorance or condescension and is insulting either way.

So the overlap is large: **precision serves both.** The research on how
people judge knowledgeability finds that specificity in language is the
main cue readers use — *including readers without the domain knowledge.* A
precise sentence reads as competence to the veteran and as authority to the
newcomer. A vague one loses both at once.

## 2. The mechanism we have that an article does not

**The thing is on screen.**

We almost never have to define a term in the abstract, because we can define
it by pointing at it while it is lit. That is the whole advantage of this
product over every explainer ever written about IP addresses, and it should
be used relentlessly.

> *"AS3333 · RIPE NCC announces six blocks. Announcing is a network saying
> these addresses are mine, out loud, to everybody who will listen."*

The veteran reads: correct AS, correct holder, correct count, correct verb.
The newcomer reads: the word *announce*, with six of them lit in front of
them. **Neither is being served a different sentence.**

## 3. Use the real word

Say **prefix**, **announce**, **registry**, **allocation**, **autonomous
system**. Do not say "a group of addresses" when you mean a prefix.

The evidence is that experts gain credibility by using the professional term
**provided it is explained**, and that avoiding it costs more than using it.
And there is a second reason that matters more here: the newcomer is going to
meet these words everywhere else for the rest of their life. **Teaching them
the real one is a gift; teaching them a soft substitute is a small betrayal
they will discover later.**

Rules:

- The real word, then the thing it names, once, at the moment it is on
  screen.
- Never define the same term twice. The notebook and the about panel are
  where somebody goes to look it up again.
- Never define a term before it is needed.

## 4. Never simplify into something false

The failure that actually loses veterans is not brevity — it is a
convincing-sounding explanation that carries an incorrect inference.

**If a thing cannot be said simply and truthfully, do not say it simply.
Show it instead**, and let the picture carry what the sentence cannot. We
have a renderer for exactly this.

Two we will be tempted by, and must not do:

- *"Your address says where you are."* It does not. Routing is not geography
  and that is a main-line beat — writing the lie early destroys the beat
  later.
- *"IPv6 is the new version, so IPv4 is being replaced."* Thirty years in and
  both are load-bearing. The honest version is stranger and better.

## 5. Plant things only the veteran will feel

These cost the newcomer nothing — they read as one more fact — and they are
what buys the veteran's patience for everything aimed at somebody else.

- `2002::/16` — *"a bridge between the two internets. Built, used, and
  abandoned."* A newcomer learns a fact. Somebody who configured 6to4 in 2004
  feels something.
- `192.0.2.0/24` — TEST-NET-1. Anyone who has written documentation knows
  exactly what that block is for.
- `AS7007`. No explanation. The people who need to know already do.
- The five final `/8`s of February 2011, named as the five.

**The rule: never wink.** Do not signal that this one is for the insiders.
State it flat and let it land or not.

## 6. The register that avoids the retirement problem

The tonal fix is not calibration, it is **stance**.

> **He is not teaching. He is pointing at his own work.**

A surveyor says *"that one's been empty since 1991."* A curriculum says *"did
you know that address space can remain unallocated?"* The first is a person
talking about a place he knows; the second is an adult performing patience.
Only the first can be overheard by an expert without irritation, because it
was not aimed at anyone's ignorance — it was just said.

Concretely, and these go on the failure list:

- **Never "did you know".** Not once, in anything.
- **Never "simply", "just", "of course", "obviously".** Each one tells
  somebody they are slow.
- **Never explain why a fact is interesting.** State it; interest is the
  reader's to have.
- **No rhetorical questions aimed at the reader.**
- He may be surprised by something. He may never be surprised *on the
  visitor's behalf.*

## 7. Progressive disclosure, which we already built

The standard answer to mixed expertise is to let the reader choose the depth,
and the machinery is already in the product:

| layer | who it is for | already exists |
|---|---|---|
| the address, first paint | everybody | yes |
| the plate: one fact, sized | both | yes |
| touchable words — a country, a registry | whoever wants more | yes |
| the guide | whoever leaves him on | planned, D |
| the notebook | the completionist | yes |
| the about panel | whoever wants the method | yes |

Nothing new is needed. What is needed is discipline about **which layer a
sentence belongs in** — the plate is not where the history goes, and the
guide is not where the definitions go.

## 8. Checks

- Take any ten consecutive lines. **Would a network engineer find one thing
  in them they did not know?** If not, the depth is too shallow.
- Take the same ten. **Is there a term used without ever being cashed out at
  something on screen?** If so, the floor is too high.
- Grep the drafts for: *did you know*, *simply*, *just*, *of course*,
  *obviously*, *basically*, *a kind of*, *think of it like*. Target: zero.
- Every simplification: is it **true**, or is it *nearly* true? Nearly true
  gets cut or shown instead.
- Read the plate copy aloud to somebody who does not know what a prefix is,
  then to somebody who runs a network. **Neither should ask who it was
  written for.**

---

## Sources

- [How experts and novices judge other people's knowledgeability from language use — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11358192/)
- [The Message or the Messenger: Explanation Satisfaction and Source Characteristics — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12730021/)
- [Precision bias](https://en.wikipedia.org/wiki/Precision_bias)
- [Progressive Disclosure — I'd Rather Be Writing](https://idratherbewriting.com/ucd-progressive-disclosure/)
- [Progressive disclosure: Minimalism to the max — tcworld](https://www.tcworld.info/e-magazine/technical-writing/progressive-disclosure-minimalism-to-the-max-501/)
