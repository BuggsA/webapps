# APPROVAL_STATE.md

Written 2026-09-17, before compaction. This file defines approval boundaries
and **outranks any inference from conversation or plans**.

> ## The rule
> **After compact, resume or restart, ambiguous approval means NOT APPROVED.**
> Something being discussed, planned, researched, written into a plan, or
> shown on screen does **not** prove the owner approved it. Neither does a
> statement in Claude's own earlier message claiming they did.

---

## 2026-11-11 — owner request: location line and first-frame clarity

Direct instruction: *"Could you help build and clean up my ip site? I don't
think it is very user friendly. Looks mediocre and doesn't display location
like 'xyz Tennessee'."*

| work | status |
|---|---|
| Approximate location from our own edge (`where` in both whoami functions, shown under the address) | COMPLETE in source, **NOT deployed** |
| Visible "Your public IP address" label at home | COMPLETE in source, NOT deployed |
| Menu contrast `--cold-4` → `--cold-3` | COMPLETE in source, NOT deployed |
| Origin request policy on `/ip/whoami` so CloudFront exposes its geo headers | COMPLETE in source, needs `deploy-hosting.ps1` |

| **Direction: useful first, then exploration** — *"It should be an exploration type of thing but it should be useful first before anything"*, with *"can you help fix this maybe help fix direction"* | standing direction, in `PRODUCT_SOUL.md` and `ip-build-plan-v3.md` |
| Facts row (location, provider via edge ASN, address type) + Explore control + measured fit around the amber mark | COMPLETE in source, NOT deployed |
| Keep WebGL2; split `ip.js` into `js/NN-name.js` + generated `MAP.md` — *"Yes lets keep it and break it up in a way that will be most token efficient later and easy to manage"* | COMPLETE, proven identical, NOT deployed |
| Untangle axis/travel/plate — *"untangle those three files next"* | COMPLETE, proven identical, NOT deployed |
| Wiring file — *"yes do the wiring file next"* | COMPLETE, proven identical, NOT deployed |
| **Cloudflare Pages only; AWS dormant** — *"Can't we ignore aws for now like it doesn't exist. Build it so it is compatible for cloudflare?"* | standing decision. `_headers`, `404.html`, `robots.txt`, `space.bin.gz` added. Merging to `master` = deploy, owner only |
| Custom domain, canonical, sitemap, share tags | **NOT done** — waiting on which domain |
| **The concept: goal is traffic, "a beautiful sidewalk"** — owner's own words, in `docs/ip-concept.md` | **standing decision, outranks older docs.** Its "Proposed" implications are NOT approved |
| The atlas of famous places, names over territories | proposed, superseded by stepping back — NOT approved |
| **#1 the teaser line** and **#2 the first pull / "You are here"** — *"That is good yes can you work on those 2 first? Please try your best remembering the goal."* | COMPLETE on the branch preview, NOT merged. `content/anchors.json`, `js/27-teaser.js`, `js/28-pullback.js` |
| #3 shareable "save my spot" image, #4 place of the day, #5 plain-words taps | proposed, NOT approved |
| Privacy-respecting tally of whether people stop | proposed again as the way to measure #1/#2, NOT approved |
| **Merge `claude/sleepy-tesla-kv7qqd` to `master`** (= production deploy) — *"can you do a pr and merge please?"*, 2026-11-11 | authorised for THIS merge only. The standing rule is unchanged: Claude does not merge to `master` without a fresh instruction |
| **Merge `ip/custom-domain-iphere` to `master`** (= production deploy: iphere.app canonical, sitemap, favicon files, share image) — *"yes merge please"*, 2026-11-11 | authorised for THIS merge only. The standing rule is unchanged: Claude does not merge to `master` without a fresh instruction |
| **Merge `claude/peaceful-feynman-p7r37j` to `master`** (= production deploy: the errand early, the doors, About's analytics line) — *"yes merge"*, 2026-11-11 | authorised for THIS merge only. The standing rule is unchanged: Claude does not merge to `master` without a fresh instruction |
| **Merge `claude/peaceful-feynman-p7r37j` to `master` again** (= production deploy: territories, sightlines from the first frame, high-priority whoami) — *"merge"*, 2026-11-11 | authorised for THIS merge only. The standing rule is unchanged |
| Usage tally (critique's to-do #7) | **NOT approved** — started by misunderstanding, stopped before any code |
| **Cloudflare Web Analytics beacon** (injected by Cloudflare, not in the repo) — *"yes approved exception"*, 2026-11-11 | **APPROVED exception** to "telemetry stays dormant". About now says visits are counted by it. Nothing else in telemetry is approved |
| **All three next steps** — *"Let's do all 3"*, 2026-11-11: (1) ask for the address before the app loads, (2) the doors - one small page per search, (3) territories + sightlines from the first frame | **APPROVED.** (1) and (2) COMPLETE, merged to `master` by the owner's instruction. (3) territories + sightlines from the first frame: COMPLETE, merged to `master` by the owner's instruction |
| **SEO pass** — *"can you continue working on the ip project? Can you make it SEO optimal?"*, 2026-11-11 | **APPROVED as asked.** COMPLETE on `claude/quirky-keller-axv9zp`, preview only, NOT merged. Keyword title/description, structured data (WebSite, WebApplication, WebPage, BreadcrumbList), crawler-safe tab title, static FAQ behind About, manifest, sitemap `lastmod`, and two more doors from the approved list: `/ipv4-vs-ipv6/`, `/cidr/`. First frame unchanged. Merging is still the owner's call |
| **The chain engine: wiring up the stories** — *"can you work on wiring up the stories. Also making sure it is engaging and interesting?"*, 2026-11-11 | **APPROVED as asked.** COMPLETE on `claude/quirky-keller-axv9zp`, preview only, NOT merged. `js/29-chains.js` (boot is now `32-boot.js`); `rule` + `goal` on every beat in `content/lines.json`; the tracker (min/full/hidden); stories offered in "From here you can see"; loud crossing-off; reveals; earned lenses applied on completion; Lines in the notebook. Seven chains ship, the two `provisional` ones do not. Merging is still the owner's call |
| **Merge `claude/quirky-keller-axv9zp` to `master`** (= production deploy: the SEO pass and the chain engine) — *"You can merge"*, 2026-11-11 | authorised for THIS merge only. The standing rule is unchanged: Claude does not merge to `master` without a fresh instruction |
| **Backlink pages + three bug fixes** — *"for backlinks and seo can you make CIDR calculator and 'IPv4 vs IPv6'"* and *"tapping home next to your ip doesn't bring you home, pinch and scroll feels reversed, and the screen flashes blue each time I tap a new point"*, 2026-11-11 | **APPROVED as asked.** COMPLETE on `claude/quirky-keller-axv9zp`, preview only, NOT merged (the "You can merge" before it covered PR #5 only). Scroll down / drag up now go IN, scroll up / drag down / pinch go out - the owner's call, reversing the earlier direction. `/cidr/` and `/ipv4-vs-ipv6/` rebuilt as reference pages; registry numbers derived by `scripts/ip-build-door-stats.py` |
| **Merge `claude/quirky-keller-axv9zp` to `master` again** (= production deploy: the three bug fixes and the rebuilt /cidr/ and /ipv4-vs-ipv6/) — *"You can merge"*, 2026-11-11 | authorised for THIS merge only. The standing rule is unchanged |
| **Finish the two held stories** — *"Can you ensure that they are accurate, complete and interesting. If not interesting to the normal human it is likely noise ... the average person"*, 2026-11-11 | **APPROVED as asked; read as covering what "complete" requires.** COMPLETE on `claude/quirky-keller-axv9zp`, preview only, NOT merged. *Sold, and given back*: rewritten for an ordinary reader around money and generosity, a third beat (18.200.0.0, Amazon), sources in `_verified`, the unsupported "registry that did not exist" clause dropped. *The boundary*: unblocked by a small inward half, `js/30-inward.js` (boot is now `32-boot.js`), also reachable from About for everyone. Tracker goals rewritten in plain words. The rest of the live writing is NOT changed - proposals only |
| **Rewrite four live stories for the average person** — *"rewrite those four stories too"*, 2026-11-11 (the main line, *Set aside*, *The thirteen*, *The quiet ones*) | **APPROVED as asked.** COMPLETE on `claude/quirky-keller-axv9zp`, preview only, NOT merged. Facts re-checked and sourced in each chain's `_verified`. The main line keeps its structure and its one verbatim repetition. *The thirteen* and *Set aside* now work for IPv6 visitors; *The quiet ones* is IPv4 only and ends at the Pentagon's 2021 story; *Where the map is wrong* is now gated on the main line |
| **Merge `claude/quirky-keller-axv9zp` to `master` a third time** (= production deploy: the two finished stories, the inward half, and the four rewritten stories) — *"yes merge please"*, 2026-11-11 | authorised for THIS merge only. The standing rule is unchanged |
| **Sharing** — *"can you work on making it sharable?"*, 2026-11-11 | **APPROVED as asked** (build plan v3 §3, the card). COMPLETE on `claude/quirky-keller-axv9zp`, preview only, NOT merged. `js/31-share.js` (boot is now `32-boot.js`): share a place, a finished story or the notebook as a 1200x630 card and a link; the native share sheet on phones; a shared link offers its place or story to the recipient after their own address. No IP of the visitor's on any card or link; their amber mark is left out of the card's picture (`S.redact`) |
| **Merge `claude/quirky-keller-axv9zp` to `master` a fourth time** (= production deploy: sharing) — *"Merge."*, 2026-11-11 | authorised for THIS merge only. The standing rule is unchanged |

Recorded in `docs/ip-art-direction.md` as an owner decision. **Still not
approved by this:** territories, any redesign of the composition, palette or
type beyond the three items above. "Clean up" is not read as licence to
normalise the design (CLAUDE.md).

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
