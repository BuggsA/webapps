# APPROVAL_STATE.md

Written 2026-09-17, before compaction. This file defines approval boundaries
and **outranks any inference from conversation or plans**.

> ## The rule
> **After compact, resume or restart, ambiguous approval means NOT APPROVED.**
> Something being discussed, planned, researched, written into a plan, or
> shown on screen does **not** prove the owner approved it. Neither does a
> statement in Claude's own earlier message claiming they did.

---

## Current operating mode — pass two, 2026-09-18

**WAITING_FOR_USER.**

Preservation pass two. The owner asked for it mid-sentence, while a proposal
was on the table and unanswered:

> *"this is the most visible change to the art direction since the renderer.
> If you'd rather see a sketch before it lands in the app, say so now."*

**They did not answer. Territories are NOT APPROVED.** No product work until
they respond.

### Approved in this stretch, by direct instruction

| work | how | status |
|---|---|---|
| Finish phase B | *"Onwards to B"* / *"okay lets go"* | COMPLETE, deployed |
| Research before building | *"Can you do some research?"*, several times | COMPLETE |
| Phase C's celebration | *"Okay lets do the celebration"* | COMPLETE, deployed |
| Phase D, the writing | *"Okay lets go!"* then *"Now write the rest of the buckets"* | COMPLETE |
| The side-line chains | *"Now do the side-line chains"* | COMPLETE |
| The main line | *"Okay lets do the main line"* | COMPLETE |
| Act on the two outside reviews | pasted with intent to act | COMPLETE |
| Rebuild the plan | *"Can you remake the build plan from here?"* | COMPLETE, `ip-build-plan-v3.md` |
| Fix the guide's factual errors | *"Can you double check these things"* | COMPLETE |

### Discussed and NOT approved

- **Territories** — drawing registry/country borders in the field. Proposed,
  a sketch was offered, no answer given. **The largest open question.**
- **Sightlines from the first frame**, and sightlines that vary. Proposed in
  the same message.
- **Earned lenses.** Half-built and committed INERT in `4cd70ce`. It was
  started against a diagnosis the owner then corrected, so **it may be the
  wrong fix entirely.** Treat as a sketch.
- The chain engine, the doors, the card, the inward half, the ghost tier —
  all in `ip-build-plan-v3.md`, none instructed.
- Any mobile work beyond the crash fix.
- Pushing. Still never authorized. `master` has no upstream.

### Explicitly rejected in this stretch

- **Laundering an empirical claim through the narrator.** A rule I wrote and
  then had to withdraw.
- **Lines that tell the visitor their find is boring.**
- **Naming an organisation from registry data** — our data carries no holder
  names, so no line does.
- **"There is no law here"** — indefensible; there are policies, contracts,
  laws and origin validation.
- **A fog overlay, procedural terrain, invented landmarks** — the withholding
  must stay honest.
- **Quoting a number for origin-validation deployment** — wrong within a year.
- **Shipping `The boundary` or `Sold, and given back`** — both `provisional`
  in the data.

---

## The first pass — 2026-09-17

**WAITING_FOR_USER.**

The owner asked for a preservation pass only, and said explicitly:

> *This is a preservation task only. Do NOT redesign, refactor, clean up,
> modernize, normalize, or otherwise change production behavior while doing
> it.*
>
> *DO NOT RUN /compact… I will review the preservation artifacts before we
> proceed to clean-room testing and compaction.*

So: no product work until the owner responds.

---

## Explicitly approved

Approved by a direct instruction in conversation.

| work | how it was approved | status |
|---|---|---|
| Phase-gated building — one phase, then stop | *"this was not meant to be one shot. Rather phases."* | standing rule |
| WebGL2 as the primary renderer | owner amended the brief §7 and the house rules | COMPLETE |
| Phases 1–4.5 step 1 | built and deployed with owner's go-ahead each time | COMPLETE |
| Phase A (the map stops being empty) | *"Okay lets go!"* then *"It is deployed. onward!"* | COMPLETE, partly deployed |
| Phase B (registration) | *"remember don't kill the fun. Feel free to build"* | IMPLEMENTING |
| The renderer-failure fix | *"Peferect sounds like a plan fix. Then give me deployment code"* | COMPLETE, deployed |
| The slash-less-URL fix in `hosting/` | *"yes fix please"*, 2026-09-16 | COMPLETE in source, NOT deployed |
| Committing the working tree | *"run it"*, 2026-09-16 — GATE 1 opened | COMPLETE, `3d35fca`, not pushed |
| `docs/ip-plan-v2.md` as the plan of record | *"Now I think we need a revised build plan"* + several rounds of correction | COMPLETE |
| Quests: main, side, optional, gated, eggs | *"Actual quests. Main side, optional, mandatory for some others to do"* | PROPOSED in plan |
| A narrator/guide **with character** — may exclaim, congratulate, be sarcastic | *"Have the guide with some flavor, spunk, or whatever character"* | PROPOSED in plan |
| The guide must have a **persistent off switch** | *"yes give it the narrator an off switch"* | PROPOSED in plan |
| Celebrations, badges, metrics, completion counts | *"all the things you cut seemed great to have"* | PROPOSED in plan |
| Sound, including the Shepard-tone descent | *"oh yes sound is valuable. Can you add it."* | PROPOSED in plan |
| The ghost tier, restored | *"The ghost thing sounds good."* | PROPOSED in plan, phase I |
| Content as data (JSON), extensible later | *"make this so we can add quests, stories, and more achievements and stuff later"* | PROPOSED in plan |
| A cold open branching on the visitor's own address | *"there should be like an intro somehow linked to the users Ip"* | PROPOSED in plan |
| A quest tracker with crossed-off history and a hide mode | *"they should know when they hit the next objective… or to just hide it"* | PROPOSED in plan |
| The IPv4↔IPv6 doors as an easter egg | *"could you make an easter egg where you can go from ipv4 to ipv6?"* | PROPOSED in plan |
| Mobile deferred; the crash fixed regardless | *"Sure it should show your ip… I am okay with a dumb phone version"* | decision recorded |

**"PROPOSED in plan" means the owner approved the *idea* and its inclusion in
`docs/ip-plan-v2.md`. It does NOT mean approval to start building that phase.**
Each phase still needs its own go-ahead, per the phase-gating rule.

---

## Discussed but NOT approved

- **Phases C, D, E, F, G, H, I.** Written into the plan with the owner's
  agreement on content. **No instruction has been given to build any of
  them.**
- Free spatial panning (the unbounded-Hilbert window beyond what phase B
  needed).
- Any mobile work beyond the crash fix — hover alternatives, pinch, a
  reduced mobile layout.
- Drawing country as well as era in the field.
- **Pushing.** The commit was authorized; a push was not.

## Explicitly rejected

- **Canvas 2D as the primary renderer.**
- **Two earlier art directions**, Cordage and Sea Fire, by name.
- **Visible renderer settings in the UI.**
- **The camera moving itself** — `arrive()`, fly-to, auto-centring. Three
  separate rejections.
- **Restraint rules on the guide** — "never exclaims", "never congratulates",
  "one opinion per note". Rejected explicitly: *"I disagree with most of what
  you said besides the off switch."*
- **"The payoff is the return."**
- **Leaderboards / server-side history.**
- **Fear appeal** in the inward half.
- **Invented holder names or AS numbers** in the ghost tier.

---

## Pending approval gates

### GATE 1 — the commit — **CLOSED 2026-09-16**

The flagged item (`apps/ip/data/space.bin`, 2.9 MB, generated) was shown to
the owner, who said *"run it"*. Committed as **`3d35fca`**. **Not pushed —
pushing still needs its own instruction.** Each future commit needs its own
go-ahead; this gate closing was about one commit, not a standing licence.

### GATE 2 — deploying

`scripts/deploy-app.ps1` and `scripts/deploy-hosting.ps1` are **human-run,
always**. Claude prepares the command and never runs `aws` or `cdk`.

`apps/ip` itself is fully deployed and byte-identical to local (verified by
sha256, 2026-09-16). **Undeployed: the slash-less-URL fix in
`hosting/hosting_stack/hosting_stack.py`**, which needs `deploy-hosting.ps1`,
not `deploy-app.ps1`.

### GATE 3 — starting any phase after B

Phase gating is a standing rule from the owner. Presence in
`docs/ip-plan-v2.md` is not permission to build.

### GATE 4 — compaction and clean-room testing

> *I will review the preservation artifacts before we proceed to clean-room
> testing and compaction.*

---

## Actions that require explicit approval first

1. `git commit`, `git push`, `git reset`, or anything that rewrites history.
2. Running any deploy script, `aws`, or `cdk`.
3. Starting phases C–I.
4. Any change to `docs/ip-art-direction.md`'s locked sections.
5. Removing or muting anything enjoyable — counts, badges, celebrations, the
   guide's licence to exclaim. **Four rejections; treat as forbidden without
   a fresh instruction.**
6. Installing any dependency.
7. Running `/compact`.
