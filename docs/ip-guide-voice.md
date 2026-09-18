# The guide's voice — research before writing

Researched 2026-09-18, before phase D, after the owner said the voice will
carry the next portions and described the character they want: **playful,
sarcastic, curious — sarcastic sometimes, but sometimes genuinely moved by
something, despite who he is.**

That instinct is a known and strong character shape, and the research says
why it works and what breaks it. This document is the spec the forty lines
get written against. Character, samples and the off switch are in
`docs/ip-plan-v2.md` §"The guide"; this is the craft underneath them.

---

## 1. Kasavin's five rules, and what each one costs us

Greg Kasavin's write-up of Bastion is the closest published thing to what we
are building: a narrator who reacts to where the player is and what they just
did, across thousands of lines. His five rules, and the local consequence:

**Dialogue for subtext.** The narrator does not name the thing on screen; he
says the thing underneath it. *"Kid finds his lifelong friend"* when the
player picks up a hammer.

> For us this is nearly free, because **the plate already states the fact.**
> `193.0.0.0/21 · AS3333 · RIPE NCC · 2,048 addresses` is on screen before he
> opens his mouth. If a line restates a number the plate is already showing,
> it is the wrong line. He is the only part of this product allowed to say
> what something *means*.

**Brevity.** *"Our environments are packed with detail and leave no room for
long speeches."* Ours are packed with numbers, which is worse.

**No fourth-wall breaking, no tutorials.** Bastion's narrator never addresses
the player directly and never explains the game.

> This is the rule we already have as §8.8 and it is the one that survived
> the owner's pushback. He never explains the interface. There is a separate
> hint line for that and it is not him.

**Reward experimentation — "like an announcer in a sports game."**

> This is the distinction the product has been missing a name for. **A sports
> announcer describes the play. They do not congratulate the viewer.** That
> is exactly the line between the celebration we want and the "Great job!"
> we do not: he can be thrilled about *what happened* and never once be proud
> *of you*.

**No repetition.** *"Nothing sucks the momentum out of the game's narrative
like a repeated line."*

---

## 2. Why "sarcastic, but sometimes moved" works

The craft consensus on sarcastic characters: sarcasm only reads as character
when it is **a defence with a reason**. It is a veil for something the
character will not say directly, and the interest is in the gap — *what the
character says is not what the character wants.* Without a reason underneath
it, sarcasm is just a tone, and a tone gets old in about ten lines.

So the surveyor needs a reason, and he has one available that is true about
the subject: **he has spent years looking at this and most of it is empty.**
Six hundred million blocks nobody announces. A sixteenth of IPv4 set aside in
1981 for a future that never arrived. He is dry because the material is
mostly disappointing.

And the sincerity lands **because of** the contrast — the reader has to have
seen enough of the armour for the moment it drops to weigh anything.

**Which gives the one rule that matters most here:**

> The unguarded moments must be **rare and unhedged.** If he relents every
> time, the relenting is the formula, and a formula cannot be sincere. Some
> finds he should simply refuse to be clever about.

A useful ratio to write against, and to check afterwards by counting:

| mode | share | what it sounds like |
|---|---|---|
| **dry observation** | ~60% | the default. Factual, a little weary, notices the odd detail. |
| **sarcasm** | ~25% | aimed at the internet, never at the visitor. Usually relents. |
| **unguarded** | ~15% | no joke, no undercut, no relenting-into-a-joke. He just means it. |

---

## 3. Repetition: the numbers

Game audio teams build **8, 12, sometimes 20+ variations** of a callout that
players will hear often, and the warning attached is that **letting two
variations drift too close together undoes the point of having them.**
Synonyms are not variations.

Bastion's answer was harder — *every* instance unique — but Bastion had seven
hours of recorded narration and we have a text file.

So the `text[]` alternatives in `guide.json` need tiers by how often the line
actually fires:

| fires | needs | examples |
|---|---|---|
| **constantly** | 10–14, genuinely different | arriving somewhere unremarkable; an empty block |
| **often** | 5–8 | recording a site; crossing into a new country |
| **occasionally** | 2–3 | finishing a line; entering a big network |
| **once ever** | 1 | a specific landmark; the cold open branch; an egg |

The frequent ones are where the character is actually made, because they are
the ones anybody will hear enough of to form an opinion from. **Write those
first and hardest.** The one-offs are the easy fun.

---

## 4. Silence is a resource

From the narrative design literature, put plainly: *if you want someone who
was silent to speak, someone else has to shut up for a while.*

The plan already says he knows when to shut up, and this is why it is load
bearing rather than polite. **The unguarded 15% only works if there is enough
quiet around it to hear it.** Long stretches where he says nothing while
someone wanders are not gaps in the content; they are what makes the content
land. This matches the motion rule the whole app runs on — nothing decorates
idle time.

---

## 5. The celebration, specifically

The owner's question was whether the celebration fits the narrator. It has to
be his, or it is a confetti cannon bolted to an instrument.

- **It is the announcer beat.** He describes what happened, with delight, and
  never says well done. *"There it is. Nineteen eighty-nine, and nobody has
  touched it since."* is a celebration. *"Great find!"* is a pop-up.
- **It is where the unguarded mode is licensed.** This is the moment the
  contrast is for. A find that is genuinely good is the right place for him
  to stop being clever — and because the rest of the time he is dry, it will
  actually mean something.
- **It must not celebrate every time.** If every recorded site gets the full
  flare and a line, the flare stops being information. Ordinary finds get the
  mark and a dry half-line; real finds get the whole instrument reacting.
- **The sound is his too.** The strike lands with the flare, not after it.

---

## 6. Failure list — how we will know it went wrong

- A line restates a number already on the plate.
- He explains the interface.
- The joke is at the visitor's expense rather than the internet's.
- He relents into warmth *every* time he is sarcastic, so the relenting is a
  tic and the warmth is worthless.
- Two "variations" are the same sentence with a synonym swapped.
- The frequent lines are the thin ones and all the good writing went into
  eggs almost nobody will see.
- He fills silence.

## 7. The test, unchanged

Phase D's exit criterion stands and this document does not soften it: **read
the forty aloud.** If they are fun, build the rest. If they are not, the
problem is the writing and no machinery will fix it.

Additionally, countable after drafting: the mode ratio in §2, and the
variation counts in §3. Both are checks, not goals — a line that is good and
breaks the ratio wins.

---

## Sources

- [In-Depth: Writing Bastion — Greg Kasavin, Supergiant Games](https://www.supergiantgames.com/blog/in-depth-writing-bastion/)
- [Why Bastion's narrator is an understated narrative lynchpin — GamesRadar](https://www.gamesradar.com/bastions-narrator-is-a-silver-tongued-storyteller/)
- [Voice Direction in Games: Why Combat Barks Are Harder Than Cutscenes](https://www.toosixmg.com/post/voice-direction-in-games-why-combat-barks-are-harder-than-cutscenes)
- [Adding Life To Worlds With Dialogue Barks — Game Developer](https://www.gamedeveloper.com/design/adding-life-to-worlds-with-dialogue-barks)
- [Functions and powers of barks in video games — DiGRA](https://dl.digra.org/index.php/dl/article/download/1990/1989/1986)
- [Character Trait: Cynical — ProWritingAid](https://prowritingaid.com/character-traits/cynical)
- [Forget Protagonists: Writing NPCs with Agency — Meghna Jayanth](https://medium.com/@betterthemask/forget-protagonists-writing-npcs-with-agency-for-80-days-and-beyond-703201a2309)
