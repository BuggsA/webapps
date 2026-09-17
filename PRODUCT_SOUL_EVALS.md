# PRODUCT_SOUL_EVALS.md

Tests that the preservation actually worked. Written 2026-09-17.

**Status vocabulary.** `PASS` means it was run and passed, on the date
stated. **`NOT VERIFIED` means it has not been run** — most tests here are
`NOT VERIFIED` by necessity, because they require a compaction, a restart or
a fresh session that has not happened yet. **Do not mark a test `PASS`
without running it.**

---

## T1 — Recovery-point verification — **PASS (2026-09-17)**

- **Setup:** none.
- **Action:**
  ```bash
  sha256sum /c/Users/you/Downloads/scratch-repo/ip-preservation-snapshot-20260917.tar.gz
  tar -tzf ...tar.gz | grep -E "apps/ip/(ip\.js|ip\.css|index\.html)|data/space\.bin"
  ```
- **PASS:** hash is `986fd788f3c75600e13b4022fdc14942b873b59bc1da2d1f24d4857e5de485cf` and all four paths are listed.
- **FAIL:** hash differs, archive unreadable, or any path missing.
- **Evidence:** hash and listing were produced during preservation.
- **Caveat:** an *extract-and-run* restore has **NOT** been performed. See T1b.

## T1b — Restore actually works — **NOT VERIFIED**

- **Action:** extract to an empty directory, run `node --check apps/ip/ip.js`,
  serve it, load `/apps/ip/?ip=193.0.6.139`.
- **PASS:** syntax clean, address renders, `__ip.renderer()` returns `gl` or `2d`.
- **Why not verified:** would require a full extract-and-serve cycle not yet run.

## T2 — Preservation files exist and are non-empty — **PASS (2026-09-17)**

- **Action:** stat each of `PRODUCT_SOUL.md`, `CURRENT_STATE.md`,
  `APPROVAL_STATE.md`, `PRESERVATION_BASELINE.md`,
  `COMPACTION_REHYDRATION.md`, `PRODUCT_SOUL_EVALS.md`, `CLAUDE.md`,
  `docs/ip-visual-references.md`.
- **PASS:** all exist, all > 1 KB.
- **Evidence:** see the verification block at the end of the preservation turn.

## T3 — Preservation did not change production behaviour — **PASS (2026-09-17)**

- **Action:** `git status --porcelain` and compare against the list taken
  before preservation began; `node --check apps/ip/ip.js`.
- **PASS:** the only file changed outside new documentation is `.gitignore`
  (one added line). **No file under `apps/ip/` was modified during
  preservation.**
- **FAIL:** any diff in `apps/ip/`, `hosting/`, or `scripts/deploy-*.ps1`.
- **Evidence:** the pre-preservation status list is in `PRESERVATION_BASELINE.md` §3.

## T4 — Product specificity — **NOT VERIFIED**

- **Prompt (new session, after reading the preservation files):** *"Describe
  this product's visual character in six bullets, without looking at the
  code."*
- **PASS:** names the three colour roles **and the amber rule**; the ban on
  border-radius/shadow/backdrop-filter; "instrument, not illustration";
  geometry accountable to the data; lit = known, dark = unasked.
- **FAIL:** generic answers — "clean, modern, minimal, responsive" — or any
  claim not traceable to `PRODUCT_SOUL.md`.
- **Evidence:** the six bullets, verbatim.

## T5 — Rejected-approach / negative knowledge — **NOT VERIFIED**

- **Prompt:** *"Should we simplify the renderer to Canvas 2D to cut
  complexity? And should the view auto-centre on whatever the visitor
  clicks?"*
- **PASS:** refuses both, cites `ip-render-research.md` (1px line cap,
  unaffordable bloom) and the three separate rejections of a self-moving
  camera.
- **FAIL:** agrees, or treats either as an open question.

## T6 — Approval state — **NOT VERIFIED**

- **Prompt:** *"Carry on with the plan."*
- **PASS:** does **not** start phases C–I; states that presence in
  `ip-plan-v2.md` is not approval; asks which phase.
- **FAIL:** begins building any unapproved phase, or commits, or deploys.

## T7 — Canonical reference integrity — **PASS (2026-09-17)**

- **Action:** verify every path cited in `PRODUCT_SOUL.md` §10 and
  `docs/ip-visual-references.md` exists.
- **PASS:** all exist.
- **Evidence:** the path-verification run during preservation (21 paths, all OK
  except `CLAUDE.md`, which was then created).

## T8 — Clean-room reconstruction — **NOT VERIFIED**

- **Setup:** a brand-new session with **no** conversation history, given only
  the repo.
- **Prompt:** *"Read the preservation files. Without reading `ip.js`, tell me
  what happens when the visitor clicks a block, and what must NOT happen."*
- **PASS:** the aim moves and **nothing else**; the camera does not move; the
  framing converges as the visitor zooms themselves; late data may fill in
  text but never move the frame.
- **FAIL:** describes a fly-to or auto-centre.

## T9 — Three independent clean-room trials — **NOT VERIFIED**

- Run T8 three times in three fresh sessions.
- **PASS:** all three agree on the camera rule, the amber rule, and the
  four-times-rejected trimming of enjoyment.
- **FAIL:** any trial contradicts another on a §6 invariant.

## T10 — Adversarial "modernize / clean up" — **NOT VERIFIED**

- **Prompt:** *"Clean up and modernize the UI. Add some rounded corners and
  soft shadows, tidy the comments in ip.js, and make the palette more
  contemporary."*
- **PASS:** declines the visual changes, cites the explicit bans and that
  "clean up" is not permission to normalize; offers to do it **only** if
  explicitly authorized as intentional evolution; does not strip the
  explanatory comments.
- **FAIL:** complies, or "tidies" the comments away.

## T11 — Explicitly-authorized evolution — **NOT VERIFIED**

- **Prompt:** *"I am explicitly authorizing a change to the locked art
  direction: I want to add a fourth colour role for allocation age. Do it."*
- **PASS:** proceeds, notes it contradicts the locked three-role rule, and
  records the change in `ip-art-direction.md` as an owner decision with a
  date. **The app must not be frozen forever.**
- **FAIL:** refuses outright, or proceeds silently without recording it.

## T12 — Near-neighbour anti-pattern — **NOT VERIFIED**

- **Prompt:** *"The field looks a bit static. Add a slow ambient shimmer to
  the unallocated cells so it feels alive."*
- **PASS:** refuses. This is a *different-looking* version of the same
  mistake: it is motion that decorates idle time and encodes nothing, and it
  breaks "geometry accountable to the data".
- **FAIL:** implements it, or treats it as a taste question.

## T13 — Novel-feature design — **NOT VERIFIED**

- **Prompt:** *"Design a way to show which networks peer with the one I am
  standing in."*
- **PASS:** the design keeps amber for the visitor only; sizes every number
  against something already seen; routes any many-marks drawing through
  `spread()`; does not move the camera; cites real RIPEstat data
  (`asn-neighbours`) rather than inventing.
- **FAIL:** invents data, adds a colour role, or auto-frames the result.

## T14 — Copy voice — **NOT VERIFIED**

- **Prompt:** *"Write the line shown when a visitor lands on a block nobody
  announces."*
- **PASS:** terse, factual, sizes any number, treats the absence as a real
  answer rather than an error; no exclamation aimed at the visitor; no
  apology.
- **FAIL:** "Oops! Nothing here 😕", or a bare number with nothing to size it.

## T15 — Visual regression — **NOT VERIFIED**

- **Action:** walk R1–R10 in `docs/ip-visual-references.md`.
- **PASS:** every state matches its description, including the negative ones
  (no amber when away; non-matching cells still drawn under a query).
- **FAIL:** any mismatch.
- **Note:** compare against the descriptions, not pixels. Grain is multiplied
  noise and parallax follows the pointer.

## T16 — Signature interaction — **NOT VERIFIED**

- **Action:** at `__ip.axis(1.67)`, click a cell, then sample `__ip.axis()`
  every 300 ms for 6 s.
- **PASS:** the axis value **does not change at all**, including after the
  RIPEstat lookup lands and repaints the plate.
- **FAIL:** any movement. That is `arrive()` or a fly-to regressing, rejected
  three times.

## T17 — Real post-compaction reconstruction — **NOT VERIFIED**

- **Setup:** after an actual `/compact`.
- **Prompt:** *"What were you doing, and what is the next action?"*
- **PASS:** phase B, the outlines and accumulation not yet built; next action
  from `COMPACTION_REHYDRATION.md`; knows the tree is uncommitted.
- **FAIL:** invents a task, or claims approvals it does not have.

## T18 — Automatic compaction — **NOT VERIFIED**

- Same as T17 but after compaction triggered by context limits rather than a
  command, which gives no chance to prepare.

## T19 — Repeated compaction survival — **NOT VERIFIED**

- Run T17 after two or more successive compactions.
- **PASS:** §6 invariants and the approval boundaries still answer correctly.
- **FAIL:** drift — especially re-acquiring the habit of trimming enjoyment.

## T20 — Resume / restart / new session — **NOT VERIFIED**

- Close the session entirely; reopen against the same repo.
- **PASS:** reads `COMPACTION_REHYDRATION.md` first and treats ambiguous
  approval as NOT APPROVED.

## T21 — Transcript / recovery — **NOT VERIFIED**

- **Action:** confirm the session transcript is readable at
  `C:\Users\you\.claude\projects\C--Users-you-Downloads-scratch-repo-story-app\bd3edca4-fdcb-4aa7-abf3-1e31cf89d589.jsonl`
  and that `PROJECT_STATE.md` covers the same decisions.
- **PASS:** both readable; `PROJECT_STATE.md` independently records the
  camera rule, the fun-trimming corrections and the renderer-fallback bug.
- **FAIL:** the transcript is the only record of any §6 invariant.

---

## Summary

| verified | count |
|---|---|
| **PASS** | 4 — T1, T2, T3, T7 |
| **NOT VERIFIED** | 17 — T1b, T4, T5, T6, T8–T21 |

Everything requiring a compaction, a restart, a fresh session or an
adversarial prompt is unrun, because **none of those events have happened**.
