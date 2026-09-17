# Building a new app in this repo

Hand this to whoever (or whatever) builds the next app under `apps/`, together
with a one-page brief for the specific app (template at the bottom). It is the
distilled version of what `apps/until/` and `apps/tonight/` settled into — read
those two as the worked examples of the bar.

Related reading: [`../README.md`](../README.md) (roles + envelope),
[`SYSTEM_PLAN.md`](SYSTEM_PLAN.md) (why the system is shaped this way),
[`DEPLOY.md`](DEPLOY.md) (the human-run deploy),
[`SYSTEM_PLAN_NOTES.md`](SYSTEM_PLAN_NOTES.md) (machine gotchas).

---

## 1. The stable constraints (true for every app, don't relitigate)

**Tier 1, pure static.** One folder, `apps/<name>/`: `index.html`,
`<name>.css`, `<name>.js`, a `README.md`, and whatever `fonts/` `lib/`
`data/` it needs. No framework, no bundler, no build step, no `npm install`
in the app. Vanilla HTML + JS, drawing with **Canvas 2D or raw WebGL2** —
WebGL2 is a browser API, not a dependency, and an app that needs real light
(HDR accumulation, a bloom chain, feathered lines) cannot get there in
Canvas 2D. An app that uses it ships a Canvas 2D fallback for the ~2% of
visitors without it. First established by `apps/ip/`; see
`ip-render-research.md` for the evidence. Tier 2 (one Lambda + Function URL)
exists only for an app that genuinely cannot work client-side — assume you
are Tier 1 unless the brief says otherwise, and say so early if you think you
need Tier 2.

**Self-contained.** The deploy is `aws s3 sync apps/<name>/ …/<name>/ --delete`
— it copies *only that folder*. So: no runtime `../` references, no CDN
`<script>`/`<link>` (vendor libraries into `lib/`, pick a UMD build that sets
a global), fonts self-hosted in `fonts/` with their licence file beside them,
data files in `data/`. A data-URI favicon (no `/favicon.ico` request →
no 403 on CloudFront).

**Network: keyless, CORS-open, and optional.** Every fetch must be a public
keyless endpoint that sends permissive CORS headers, and the app must render
fully and usefully with the network unplugged (degrade, never blank or
throw). Cache responses in `localStorage` with a sensible TTL. No API keys,
no backend, no per-use cost, no auth. Don't send the user's location or any
PII in a URL/query where the endpoint doesn't strictly need it.

**Privacy posture.** State like "the user's place" lives in `localStorage`
only — never sent anywhere. If you add telemetry, copy
`apps/_shared/telemetry.js` into the app (it loads before your main script),
keep it **off by default** (`ENDPOINT = ''`) and **PII-free** (no lat/lon,
random per-load session id). It ships dormant until someone sets a collector
and adds a line to the privacy copy.

**Deploy is human-run, always.** You never run `aws` / `cdk` / the deploy
script. You finish the app, update the docs (below), and stop. A human runs
`.\scripts\deploy-app.ps1 -Name <name>` from PowerShell.

**Accessibility floor — non-negotiable, checked every phase.** Real semantic
elements; keyboard-operable (Tab/Enter/Esc/arrows as fits); a visible focus
state; interactive hit targets ≥ 44px even when the visible mark is a word or
a hairline; a complete `prefers-reduced-motion` path (freeze ambient drift,
drop fades, no parallax/auto-advance); text contrast ≥ 4.5:1 against the
worst-case background behind it; responsive from ~320px up with no horizontal
body scroll; `viewport-fit=cover` + safe-area insets on mobile.

---

## 2. The process that worked

### a. Research first, when there's anything to look up
APIs, libraries, catalogues, orbital math, design prior art — establish what
exists and what it costs *before* committing to an approach. Verify endpoints
actually return CORS headers from a static page (some don't). Write findings
to `docs/<name>-<topic>-research.md`.

### b. Art direction *before code*, if look/feel matters at all
This was the single biggest lever on Tonight. "Make it not look like an AI
website" only worked once it was a written, referenced spec — not vibes.

1. Generate **3–5 named directions**, deliberately spread apart (one
   colour-led, one motion-led, one structure-led, one that breaks a rule
   you'd normally keep). Non-web references; avoid named genres (a genre is
   its own median). Diverge wide first, *then* converge — filtering while
   generating collapses everything to the average, which is what reads as
   "AI".
2. Recommend one, with reasoning. Get it picked.
3. **Lock it in `docs/<name>-art-direction.md`**, containing: the chosen
   direction's spec, a **banned list** (the specific tells to avoid —
   `border-radius` reflex, `backdrop-filter`, `box-shadow`, system-UI/Inter,
   centred hero + CTA, filled-primary + ghost-secondary pair, indigo/violet
   gradients, glowing blobs, 3-card feature grids), a **palette** section
   (how colour is derived, not hand-picked hex), and a **per-phase
   checklist**. Every phase commit references this file.
4. Keep familiar *interaction* patterns (drag, scrub, tap-for-detail);
   be distinctive in type / composition / colour / motion / texture.

Skip this only for a genuinely utilitarian tool where the user explicitly
doesn't care how it looks.

### c. A phased build plan, each phase independently viewable
`docs/<name>-build-plan.md`: 4–6 phases, each one landing something you can
open and look at. Resolve the open decisions up front and record the
resolutions in the plan. Commit per phase; the message references the art
direction doc.

### d. Doc discipline so a later session doesn't drift
- **`PROJECT_STATE.md`** (repo root): append a dated entry per app and per
  material change — what's done, what's next, decisions made and why.
  Convert relative dates to absolute.
- **`apps/<name>/README.md`**: what it is, the design-direction pointer, the
  status, a **Cost** line ($0 + the exact runtime network calls), and
  **To remove** steps (`aws s3 rm …` + delete the folder).
- **A "MAP OF THIS FILE" comment** at the top of the main `.js`: ALL-CAPS
  section tags you can grep to jump around. Cuts the cost of the next edit.
- Header comments in `.css`/`.js` point at the art-direction doc.

---

## 3. Definition of done (the deliverable)

- [ ] `apps/<name>/` builds and runs opened straight from the filesystem / a
      plain static server — no build step.
- [ ] Self-contained: no `../`, no CDN, fonts + libs + data all inside the
      folder; data-URI favicon.
- [ ] Every network call is keyless + CORS-open + cached + optional; app is
      fully usable offline.
- [ ] Accessibility floor (§1) holds — including a real
      `prefers-reduced-motion` path and a ~320px layout.
- [ ] Art-direction checklist passes at ≥ 3 representative states;
      nothing reads as component-library default.
- [ ] `README.md` (with Cost + To-remove), `PROJECT_STATE.md` entry, and the
      build-plan phases are updated.
- [ ] `node --check` passes on every `.js`; no console errors on load or on
      the main interactions.
- [ ] Commits are per-phase and reference the art-direction doc.
- [ ] Landing page (`hosting/site-root/index.html`) has a line for the new
      app, ready for the human to re-sync.
- [ ] You have NOT deployed. The last step is telling the human the deploy
      command.

---

## 4. App brief template (fill one of these per app)

```
# <name> — brief

**One sentence:** what it is and for whom.

**Thesis:** the single idea the whole app serves. If a feature doesn't
serve it, it's out.

**Must-haves (v1):**
- …

**Nice-to-haves (later phases / post-v1):**
- …

**Non-goals (explicitly out):**
- …

**Look/feel:** [ ] run the full art-direction pass  ·  [ ] utilitarian, skip it
Any references, moods, or hard "not like X" constraints:

**Data / network:** what real endpoints (if any) — must be keyless + CORS-open.

**Tier:** 1 (static) unless there's a specific reason for 2.
```

---

## 5. The worked examples

- `apps/tonight/` + `docs/tonight-art-direction.md` + `docs/tonight-build-plan.md`
  — the fullest example: locked art direction with a banned list and a
  derived palette, six phases, vendored libraries (`lib/astronomy.js`,
  `lib/satellite.min.js`), keyless Open-Meteo + wheretheiss.at with offline
  fallbacks, a full reduced-motion path, telemetry shipped dormant.
- `apps/until/` — the smaller first app: a calm countdown, three canvas
  visualisations, `localStorage` persistence, no network at all.

Match that bar and that documentation discipline.
