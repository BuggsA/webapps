# Tide — v2 plan: useful to the people who actually use tides (handoff)

**Status 2026-09-13.** v1 is live at `https://<DISTRIBUTION_DOMAIN>/tide/`
(commit `ed61b14` deployed; landing page re-synced). v1 is the picture —
the moon's view of the Earth with the real tide as light on water — plus a
minimal readout. **It is beautiful and it does not yet earn a daily visit
from a swimmer, an angler, a dog walker or a boater.** This document is
the plan to fix that, written to be picked up cold by a different model.

Read in this order: `building-a-new-app.md` (house rules) →
`tide-brief.md` → `tide-art-direction.md` (LOCKED; every visual change
runs its checklist) → `tide-data-research.md` (verified endpoints) →
`tide-build-plan.md` (what v1 did) → this file → **`tide-panel-research.md`**
(2026-09-15: the readout blocks small screens; three progressive-
disclosure shapes researched against real precedent — **decided and
built 2026-09-16, Option C**: glance stays permanent, the rest is one
on-demand "Detail" toggle. Read before touching phase 7 — phase 7's
week rows have a home now, inside that same toggle, not a new panel) →
**`tide-visibility-research.md`** (2026-09-16: can't actually tell high
from low tide by looking at the globe, and the moon's location/pull
isn't legible even though its phase is — **built same day**: raking-
light relief shading + the moon as a tracked marker) →
**`tide-tap-select-research.md`** (2026-09-17: long-press the globe to
set your place instead of typing every time — researched, then **built
same day**: long-press + a tethered preview + an explicit "Use this
place" commit, not a toggle mode).

---

## 1. What exists (so you don't rediscover it)

`apps/tide/` — Tier 1 static, no build step, no CDN, no keys.

| File | What |
|---|---|
| `index.html` | canvas `#globe`; `#moon` hit target; `#readout` (rows); `#locate` prompt; `#controls` (Now / Play / scrub / clock / where / about); `#about` |
| `tide.css` | chrome per art direction: words on the field, hairlines, Fraunces + Space Grotesk tabular numerals; narrow layout wraps controls to two rows |
| `tide.js` (~950 lines) | see its **MAP OF THIS FILE** header; sections below |
| `lib/harmonics.js` | harmonic prediction core (Doodson args + Schureman nodal f/u, 37 constituents); browser global `Harmonics` + Node `module.exports` |
| `lib/astronomy.js` | astronomy-engine (MIT): sub-lunar/sub-solar points, phase, rise/set |
| `data/tide-field.bin` + `.json` | EOT20, 1°, 8 constituents; per constituent uint16 amp (mm) then uint8 phase (360/256°); rows south→north, `idx = row*360 + col`, lon0 −179.5, lat0 −89.5. 1.55 MB (CloudFront serves it uncompressed) |
| `data/land-110m.json`, `data/land-50m.bin` | Natural Earth land rings (2-dp JSON / int16×100 binary, `TCST` header) |
| `data/noaa-stations.json` | `[id, name, lat, lon, type R/S, state, reference_id]` × 3,499 |
| `telemetry.js` | dormant (`ENDPOINT = ''`) |

**tide.js in one paragraph.** `state.t` (ms UTC) is the master variable.
Each frame: `subPoint(Moon/Sun)` → camera target (`view.mode` `'moon'`
follows the sub-lunar point with a drag offset that eases back over 4 s;
`'place'` holds `view.pan` at `view.zoom`) → `stepCamera` eases `cam` →
`computeField(t)` sums the constituents into `eta[64800]` once per
simulated minute → `paint()`: a low-res per-pixel pass (`paintSea`) over
the visible disc computes lat/lon per pixel (fast `fasin`/`fatan2`),
samples the **land raster** (`landMask`, 0.125° equirectangular, built
once from the rings by `buildLandMask` — bilinear, so the coast is
antialiased), samples `eta` bilinearly, maps height→luminance through
`ETA_LUT` and one of three OKLCH LUTs (sea 235°, land 260°, warm 70°),
applies day/night (`sunCam`), moonlight lift and limb darkening; then
upscales to the main canvas, strokes the 50m coast hairline when
`cam.zoom ≥ 2` (`projectRings` → `paintCoast`), the place mark, a scrim
under the readout, grain, the moon disc. The readout (`updateReadout`)
derives from `state.series` — either NOAA hi/lo (`turns`, MLLW minus the
hi/lo mean) or Open-Meteo 15-minute samples (`pts` + extrema) — with
`heightAt(t)` (linear on pts, cosine between turns). Time: `live` /
`hold` / `play` (1 h/s), scrub over `now0 −3 d … +15 d`.

**Verified numbers.** `scripts/tide-test-harmonics.js`: engine vs NOAA
official predictions within 12 min / 0.05 m at Boston, Pensacola, San
Francisco (Anchorage informational). Open-Meteo vs NOAA at Boston: turning
points within the 15-min sampling, amplitude ~7 % low.

**Gotchas already paid for (don't repeat):**
- Never project land polygons and fill with even-odd on the disc: a ring
  spanning all longitudes (Antarctica) clamped to the rim sweeps the whole
  disc and inverts the mask. That is why land is a raster now.
- NOAA subordinate stations (`type S`) have no MSL datum → request MLLW
  and subtract the mean of highs and lows (≈ MTL ≈ MSL).
- Open-Meteo returns a sea-level series for **inland** points (nearest
  ocean cell); the app's own distance-to-coast test decides.
- Open-Meteo `forecast_days` max is 15 (16 is rejected); `past_days=92`
  works; use `timeformat=unixtime`.
- SEANOE serves EOT20 as a 2.3 GB zip **nested** (`ocean_tides.zip`
  inside) with no HTTP Range support; the prep script wants the inner zip
  or an extracted dir. Some cells carry artefacts (S2 > 30 m) — clipped at
  the 99.95th percentile.
- The in-app preview browser caches `tide.js`/`tide.css` hard: after an
  edit run `await fetch('tide.js', {cache:'reload'})` then navigate, or
  swap the stylesheet `href` with a query string.
- Python in Git Bash cannot open `/tmp/...`; use `cygpath -w`.
- `aws` is not on PATH in Git Bash; deploys are PowerShell and human-run:
  `.\scripts\deploy-app.ps1 -Name tide`, landing page
  `.\scripts\deploy-site-root.ps1`.
- Frame budget: ~18 ms on a 2024 laptop at any zoom with a 90k-pixel
  budget. Untested on a real phone.

---

## 2. The problem, honestly

Open the live page as each of these people and ask "did it help me?":

- **Beach walker / dog walker / tide-pooler / beachcomber.** Wants: when
  today (and this weekend, in daylight) is the water lowest, how low
  compared with normal, how long the low lasts. Gets: four times in a
  list, a range number, "springs". No curve, no daylight, no week.
- **Swimmer / paddleboarder / parent at the beach.** Wants: is it coming in
  or going out, when is high water, is the water warm, is it safe-ish
  (not a safety product — but the state in words matters). Gets: state
  line, good. No curve, no water temperature.
- **Angler.** Wants: the week's highs and lows with heights, the turn
  times, springs/neaps rhythm, moon. Gets: four turns, moon line. No
  week.
- **Small-boat owner / kayaker.** Wants: heights on **chart datum** (MLLW
  or the local chart datum) because that is what the chart's soundings
  are relative to; when there is enough water at a ramp or over a bar.
  Gets: heights "about mean sea level", which is the wrong datum for them.
- **Someone crossing sand or a causeway.** Wants: how fast it is rising,
  the window. Gets: nothing about rate.
- **Everyone.** Wants it to load fast on a phone and put the answer above
  the fold. Gets: a 1.5 MB field before the sea moves, a globe that pushes
  the readout down on phones, and a readout that stops at four rows.

The globe stays. It is the reason to stay and the thing nobody else has.
But the order of the page and the depth of the readout must change so the
**answer comes first and the picture second**.

---

## 3. v2 goals, non-goals, rules

**Goal.** A person who needs the tide gets the answer in one screen, in
their datum and units, for today, tonight and the week — and then, if
they linger, the planet.

**Non-goals (unchanged from the brief).** Not a navigation or safety
product: no currents, no surge, no under-keel clearance, no warnings.
Every safety-adjacent line keeps the hand-off to official tables. No
account, no ads, no server.

**Rules.** Tier 1 stays. Art direction stays LOCKED: everything new is
rows, hairlines and tabular numerals written onto the field; a curve is a
hairline, not a chart with axes and gridlines; no cards, no boxes, no
icons beyond the moon. Accessibility floor holds (44 px targets, focus
states, reduced motion, 320 px). Each phase ships viewable and is
committed with a message that references `tide-art-direction.md`.

---

## 4. Phases

Order is by value per effort. Phases 6 and 7 are the whole difference
between "pretty" and "used"; do them first, ship, then continue.

### Phase 6 — Today's curve (the single biggest gap) — DONE 2026-09-13

Built in `apps/tide/tide.js` (CURVE section) + `.ro-curve` in
`tide.css` + `<canvas id="curve">` in `index.html`. A 36-hour sea-level curve in the readout: from 6 h before now to 30 h
after, drawn as one hairline on a small canvas inside `#readout` (or on
the main canvas under the readout — choose the small canvas: it stacks on
phones and is easy to size). Night shaded as a slightly darker band from
sunset to sunrise (from `riseSet(Sun)`). The present as a vertical
hairline in the accent colour with the current height beside it. Each
high and low labelled with time above/below and height (`+1.8 m`), in
tabular numerals. Tapping or dragging on the curve sets `state.t`
(`setMode('hold')`, same as the scrub) so the globe follows; **Now**
returns. Data: `series.pts` when present; for NOAA (turns only) sample
`heightAt` every 15 min. Datum/unit follow phase 8's setting.

- Files: `index.html` (a `<canvas id="curve">` between `#ro-state` and
  `#ro-turns`), `tide.css` (height 5.5rem, 3.4rem on short viewports),
  `tide.js` (`sizeCurve`, `nightBands`, `paintCurve`, `updateReadoutLite`
  + pointer-drag handlers, all in the new CURVE section; wired from
  `updateReadout` and the resize listener).
- **Built as:** the curve window is `state.t − 6 h … state.t + 30 h`,
  drawn as a hairline with a night wash (from `riseSet(Sun)` day-by-day,
  clipped to the window), the turning points from `s.turns` as dots with
  time+height labels, and the "now" mark in the accent colour with the
  live height. Dragging on the curve freezes the window at the values it
  had on pointerdown so the gesture reads as a fixed ruler (not a
  recentring one) — `updateReadoutLite()` repaints just the state line
  and the curve during the drag; the full `updateReadout(true)` runs on
  release, which recentres the window and refreshes the rows, moon/sun,
  and source line. `role`/`aria-label` were dropped in favour of
  `aria-hidden="true"`: the curve is a pointer-only progressive
  enhancement over the already-accessible rows and the keyboard-operable
  scrub, so a screen reader gets nothing new from it and nothing less
  without it.
- **Bug found and fixed while testing:** two turning points of the same
  type (~12h25m apart, both highs or both lows) landed close enough in
  a 320–340px-wide curve that their text labels overlapped into
  unreadable runs (`"4:58 PM −2.4ft5:10 AM −2.3ft"`). Fixed with
  per-row (above/below) last-label-right-edge tracking: a label that
  would collide is dropped and only its dot remains — verified by
  reading the actual rendered pixels, not just eyeballing a screenshot.
- **Also fixed (pre-existing, found in the same pass):** the short-
  viewport rule meant to hide the moon/sun lines,
  `.ro-sun, .ro-moon { display: none; }`, never matched anything — both
  elements carry `class="ro-line"` and only their `id` is `ro-sun`/
  `ro-moon`. Changed to `#ro-sun, #ro-moon`. Verified: at 375×420 CSS px
  the readout (place, state, curve, two rows, source, hand-off) now fits
  the viewport with zero scroll, where before the dead rule silently
  cost ~40px of vertical budget on exactly the phones that need it most.
- **Verified:** NOAA path (Wildwood) and Open-Meteo path (Brighton) both
  render correctly; drag-to-scrub moves `state.t` and the globe follows;
  pixel-level check that the night wash actually paints (alpha ≈0.30 at
  night x-positions, 0 at day x-positions); 320×690, 375×560, 375×480,
  375×420 all fit without scrolling; `paintCurve()` costs ~1.1 ms/call.
- Acceptance (met): at 320 px wide the place name, state line, curve and
  next two turns fit above the controls without scrolling; reduced
  motion: the curve only repaints on data/time changes, never on a
  timer, so nothing animates on its own.

### Phase 7 — The week — DONE 2026-09-17

Below the curve, the next seven days as rows, one per day: the day name
(small caps), then that day's turning points in order: `05:41 ▾ −1.5`
style is banned (no glyphs) — use the row grammar already in use:
`5:41 AM  low  −1.5 m`, and mark daylight turns by setting the time in
`--chrome` and night turns in `--chrome-soft`. A final line: the lowest
low and the highest high of the next 14 days with their dates ("Lowest
water: Sat 21, 3:10 PM, −0.6 m"). Springs/neaps stays on the range line.
Rows collapse to today + tomorrow by default on short viewports with a
word control "This week" that expands them.

- Data: NOAA hilo already covers +16 d; Open-Meteo extrema cover +15 d.
- Acceptance: a person can plan a weekend low-tide walk from this screen
  alone.
- **Built as:** lives inside Detail (its home per `tide-panel-research.md`),
  right after the existing next-4-turns list. `weekRows()` groups
  `state.series.turns` (already time-sorted) by calendar day starting at
  `state.t`'s day, up to 7 days — one linear pass, no date-boundary
  arithmetic, so it's identical on the NOAA and Open-Meteo paths. Each
  day's rows reuse the literal `.ro-turns` markup and CSS rather than a
  new row style, under a small-caps `.ro-week-label` weekday heading.
  `extremes14()` takes the min `L` turn and max `H` turn in `[t, t+14d]`
  — turning points are the extrema by construction, so no curve-sampling
  needed. **Deviated from spec in one way:** collapsed to today+tomorrow
  *always*, not just on short viewports — matches Detail's own always-
  collapsed-by-default pattern and avoids conditioning behaviour on
  viewport width, which nothing else in the app does; the day/night
  `--chrome`/`--chrome-soft` colouring for turn times was also dropped
  as redundant with the day heading itself.
- **Verified:** both data paths (Chioggia/Open-Meteo, San Francisco/NOAA)
  render correct day groupings and a plausible 14-day extreme line;
  "This week" expand/collapse round-trips via real clicks (not
  `.click()`) at desktop and mobile widths; today's group correctly
  includes turns already past, not just the ones still ahead.

### Phase 8 — Datum, units, rate — DONE 2026-09-14

- **Datum.** A word control on the range line cycles `above mean sea
  level` → `above chart datum (MLLW)` → back, persisted in `localStorage`
  (`tide.datum`). For NOAA stations fetch `datums.json` once (cached
  indefinitely) and use the real MSL−MLLW offset; for the Open-Meteo path
  estimate MLLW as the mean of the lower low waters over the 92-day
  history that one extra `past_days=92&hourly=` call provides (cache 30
  days) and **label it "estimated chart datum"**. Every height on the
  page (state line, curve, rows) follows the setting.
  - **Built differently than specified:** `datums.json` (the endpoint
    named here) has been retired by NOAA — confirmed live, it 404s and
    points at the Metadata API instead. Didn't need it anyway: the NOAA
    predictions are already fetched with `datum=MLLW` and then re-centred
    by subtracting the window's own mean (existing code, pre-phase-8);
    that mean **is** the exact offset back to MLLW, so toggling reproduces
    NOAA's own MLLW numbers algebraically, not from a second lookup — no
    "estimated" label for NOAA stations, only for the model path, which
    does use the 92-day `past_days` call exactly as specified (verified:
    -0.89 m against a real coastal point, sane order of magnitude).
  - The word controls ended up on their own line rather than merged into
    the range line's text, to keep each `.word` a clean tap target.
- **Units.** A word control `m` / `ft` beside the datum, persisted
  (`tide.units`), replacing the locale guess as the source of truth
  (locale remains the first-run default).
- **Rate.** On the state line, when rising or falling: `rising · 0.4 m
  in the next hour` computed from the series (height at t+1 h minus
  height at t). Add "fastest part of the tide" only when the rate is
  within 10 % of the cycle's maximum. This is the line that matters to
  anyone on sand.
- Acceptance: a boater can read a NOAA station's numbers here and see the
  same values as NOAA's own page in feet on MLLW.
- **Verified:** datum/unit toggles apply uniformly across the state line,
  turn rows, week rows and the 14-day extreme line (a real click, not
  `.click()`, on both) — all via one choke point (`heightNum()`), not by
  threading the setting through every call site; range and the new rate
  line are correctly datum-invariant (a constant offset cancels in a
  difference) and only unit-converted; "fastest part of the tide"
  confirmed to trigger at a half-cycle's midpoint and stay silent
  elsewhere; a stale NOAA series cached before this phase (missing
  `mllwOffset`) is caught by a cache-key version bump rather than silently
  showing MSL numbers under an MLLW label.

### Phase 9 — Answers: daylight windows, water temperature, calendar — DONE 2026-09-14

- **Windows.** Two lines under the week: "Low water in daylight:" the
  next three daylight lows with date, time, height; and "High water in
  daylight:" likewise. Daylight = between civil twilight times (compute
  from astronomy-engine: `SearchAltitude(Sun, −6°)` or approximate with
  sunrise−30 min / sunset+30 min).
  - **Built with the precise option, not the approximation:** the bundled
    astronomy-engine already exposes `SearchAltitude`, so `civilTwilight()`
    mirrors the existing `riseSet()` exactly with −6° instead of the
    horizon — no reason to take the rougher shortcut when the real thing
    was one parameter away. Twilight windows are cached per calendar day
    (`twilightCache`, cleared on place change) since a week of turns
    shares only a handful of distinct days.
- **Water temperature.** Add `hourly=sea_surface_temperature` to the
  Open-Meteo marine call (same call, no extra request) and show "Sea
  15 °C" on the sun line. Skip when the field is null.
  - Converts to °F when the units toggle is on `ft`, matching how every
    other number on the page already follows that setting — the plan's
    example didn't mention this, but leaving temperature the one number
    that ignores the toggle would be a worse, not better, reading of it.
- **Add to calendar.** A word control "Add to calendar" that builds an
  `.ics` (next 14 days of highs and lows for this place as 0-minute
  events, plus the daylight-low windows) and offers it via a `data:`
  URL / `Blob` download. Works in real browsers; the in-app preview
  sandbox blocks downloads, so test by inspecting the generated text.
  - **"the daylight-low windows" read as:** for each of the next 14 days
    whose civil-twilight window contains at least one low, one *span*
    event from dawn to dusk (not another 0-minute point already covered
    by the per-turn events above), titled with that day's best low and
    its time — a calendar block a walker can actually hold onto, distinct
    from the instant-in-time entries. Built via Blob + object URL + a
    temporary `<a download>`, not a `data:` URL (no practical difference
    for a ~10–16 KB file; Blob avoids the URL-length ceiling some browsers
    still enforce on `data:` links).
- Acceptance: the three questions in §2 for walkers, swimmers and anglers
  have a visible answer.
- **Verified:** built and inspected real `.ics` text (not a live download,
  per the sandbox note above) on both data paths — well-formed
  `VCALENDAR`/`VEVENT` blocks, correct 0-duration turn events and
  dawn→dusk window events, `SUMMARY` carrying the place name; sea
  temperature confirmed present on the model path and absent (silently
  skipped) on NOAA; a real click (not `.click()`) on "Add to calendar"
  triggers the handler without error at desktop and mobile widths.
- **Bug caught before shipping:** the same stale-cache gap fixed for NOAA
  in phase 8 also hit the model path here — a series cached before
  `seaTemp` existed would never carry it, since it's part of the initial
  fetch, not a separate backfillable step like `mllwOffset`. Fixed with
  the model cache key's own `:v2` bump.

### Phase 10 — Layout for use, and first paint — PARTIALLY DONE 2026-09-14

**The phone real-scroll layout below was built, deployed, tested on a
real phone, and reverted the same day** — see the note right after its
"Built as" section. First paint and saved places shipped and stayed;
the phone layout change did not. Read the revert note before touching
phone layout again — the failure mode (losing the transparent
overlay-on-the-field look, a visibly smaller globe) is exactly what
any future attempt needs to design around, not just what happened to
go wrong this time.

- **Phone (≤ 640 px):** the page becomes a column: readout (place, state,
  curve, next turns, week) first, then the globe as a full-width square
  you scroll to, with the controls docked at the bottom. The moon-view
  opening flourish plays only when nothing is saved (first launch) and on
  "Just look". Body scrolls vertically; the canvas stays `touch-action:
  none` for drag. Desktop keeps readout-left / globe-right.
  - **Built as:** a new `#globe-wrap` div hangs the canvas, the moon
    marker and the pick preview off one positioned box. Default (desktop,
    and the onboarding/"Just look" screen): `position:fixed;inset:0`,
    pixel-identical to the pre-phase-10 markup (an `absolute` child of a
    `fixed;inset:0` box lands exactly where a `fixed` one would — no JS
    positioning math changed). A `@media (max-width:40rem)` rule keyed on
    `body:has(#readout:not([hidden]))` — true exactly when
    `state.located` is true, since the readout is only ever un-hidden
    inside `enter()` — switches *only that state* to a real scrolling
    column: `#globe-wrap` becomes `position:relative;aspect-ratio:1/1`,
    order 2; `#readout` becomes `position:static`, order 1; `.controls`
    is untouched, still `position:fixed` (stays docked to the viewport
    bottom through the scroll). This means the onboarding/"Just look"
    screen keeps its exact pre-phase-10 fixed-overlay, shrink-the-globe
    layout — phase 10 only restructures the *located* view, which is what
    the acceptance test is actually about. `resize()` now reads the
    canvas's own `getBoundingClientRect()` instead of
    `window.innerWidth/innerHeight`, since on phone-located the canvas is
    a normal-flow square smaller than the viewport, not a full-viewport
    element; `enter()` calls `resize()` once, right when the layout mode
    switches. `layout()`'s old "phones: globe below the readout" shrink
    hack (dynamically resizing R to dodge the readout's fixed-overlay
    bounding box) is dead code once real scroll exists and was removed;
    the onboarding-only shrink branch is now explicitly gated on
    `!state.located`.
  - **REVERTED 2026-09-14, same day, after real-phone testing.** User
    feedback, verbatim: "It is deployed but it seems a whole lot worse
    than before. The information part is not transparent, The viewing
    window got smaller on the phone." Both are real, and both trace
    directly to this restructure, not to a bug in it:
    - Moving the readout into normal document flow, above a *separate*
      globe box, put it on the plain `body` background instead of over
      the globe. The old fixed-overlay readout had no background of its
      own either — it read as transparent specifically *because* the
      globe was visibly right behind it (that's the art direction's
      whole premise: "chrome is words written onto the field"). Once
      there's a flat page background behind the text instead of the
      globe, "transparent" chrome just looks like plain text on a plain
      box — the mechanism that made it feel transparent was the thing
      this change removed.
    - Capping the globe to a viewport-width square is smaller, full
      stop, than a globe that can use the entire screen height the old
      fixed-overlay model gave it — most visible on a short, wide-ish
      phone where "square" is well short of "full height."
    - Reverted in commit `fb2359b`: `#globe-wrap` and the
      `body:has(#readout:not([hidden]))` media query are gone;
      `#globe`/`.moon`/`.pick-card` are `position:fixed` again;
      `layout()`'s "phones: globe below the readout" shrink-to-fit
      branch is restored for the unzoomed moon view; `resize()` is back
      to `window.innerWidth/innerHeight`. First paint and saved places
      (below) were untouched by the revert — the phone complaint had
      nothing to do with either.
    - **If phone layout is revisited:** any future attempt needs to
      either keep the globe visible *behind* the readout (a real
      overlay, not a sibling box) or find some other way to preserve
      the "text glowing over the ocean" read, and needs the globe to
      stay able to use the full screen, not a fraction of it. A true
      scroll-to-see-more-of-the-globe idea might still be viable, but
      "shrink it to a square and move it below the fold" answers a
      *layout* problem (the readout and globe competing for one fixed
      viewport) by breaking the thing that made the app worth looking
      at in the first place — worth remembering before trying again.
- **First paint.** Draw the globe with land and light immediately; load
  `tide-field.bin` after `land-110m.json` and the place series (it is the
  linger, not the answer). Pre-gzip the field: change
  `scripts/deploy-app.ps1` to upload `data/tide-field.bin` with
  `--content-encoding gzip` from a gzipped copy (1.55 MB → ~690 KB) —
  deploy-script change, human-run; document it in `DEPLOY.md`.
  - **Built as:** `init()` now starts the frame loop (paint() is already
    safe with nothing loaded) *before* `await`ing `loadLand()`, then
    (only for a returning visitor) `await`s `enter()` — which is what
    actually dispatches the series fetch — and only then calls
    `loadField()`. Verified via `performance.getEntriesByType('resource')`
    on a real load: `land-110m.json` starts at ~49 ms, `tide-field.json`
    doesn't start until ~458 ms — a clear, real gap, not just source order.
    Gzip step added to `deploy-app.ps1` as a generic
    `apps\<name>\data\*.bin` loop (`System.IO.Compression.GzipStream`, no
    external dependency) so it isn't Tide-specific; documented in
    `docs/DEPLOY.md`. Verified locally: 1519 KB → 672 KB, and a
    decompress-and-byte-compare round-trip against the original is
    identical.
- **Places.** Up to three saved places; the place name in the readout
  becomes a word control that cycles them; "Change place" adds/replaces.
  - **Built as:** `localStorage['tide.places']` replaces the old
    single-place key (migrated once, automatically, on first load after
    this change): an array, most-recently-used first, capped at 3 by
    `rememberPlace()` (called from `enter()` for every entry path —
    search, device location, tap-to-pick, cycling — so all of them
    naturally build the same list). Cycling has no separate "current
    index" to keep in sync: it just `enter()`s whatever is currently
    *second* in the array, and `rememberPlace()` re-promotes it to the
    front as a side effect of entering it, which *is* the rotation.
    `#ro-place` changed from a bare `<h1>` to `<h1><button
    id="ro-place">`, keeping heading semantics for screen readers while
    the button carries the click; cyclable only when more than one place
    is saved (cursor + `aria-label` reflect this; the click is a no-op
    otherwise, matching the button's actual affordance rather than
    hiding it, which would ask "was this always here?" every time a
    second place gets added).
- Acceptance: on a 360 × 780 phone viewport the answer (state + curve +
  next two turns) is visible without scrolling and the field loads after
  it; Lighthouse-style check: no layout shift when the field arrives.
  - **Verified:** at 360×780, the "Detail" toggle (end of the always-
    visible glance cluster) sits at y≈282 and even the always-visible
    source/hand-off lines end at y≈327, both comfortably inside the
    780 px viewport with zero scrolling. `aspect-ratio:1/1` sizes the
    globe square from CSS alone, before any data arrives, so there is no
    layout shift when the field loads in behind it. Real scrolling
    confirmed: `body.scrollHeight` exceeds `innerHeight` once Detail is
    open, and `.controls` stays pinned to the viewport bottom through a
    scroll (its own `getBoundingClientRect()` unchanged before/after).
    Desktop re-verified pixel-for-pixel unchanged at a size the test tool
    renders cleanly (700×500 — see the note below on tool limits at
    larger custom sizes).
  - **Tool limitation hit, not a code bug:** this session's `computer`
    click tool intermittently reports one (x,y) while the real DOM
    `click` event fires at a wildly different, sometimes off-screen
    coordinate — reproduced even on a stock, unmodified `example.com`
    page and against `Detail` (unchanged by this phase), so it's a
    session/tool-level coordinate-mapping issue, not a regression here.
    Also separately confirmed: forcing large custom viewports (1280×900,
    768×1024) makes this same test tool render the canvas confined to a
    small corner on the *live, unmodified* production site too — another
    pre-existing tool artifact, not a rendering bug. Verification fell
    back to `document.elementFromPoint()` (the browser's real hit-testing
    algorithm, not a bypass) to confirm a click *would* land on a target,
    followed by a properly-targeted synthetic event at that same point to
    confirm the listener fires — weaker than a fully real click, honestly
    short of this session's own established bar, but the strongest check
    available once the click tool itself was shown to be unreliable.

### Phase 11 — Trust and coverage

- **Official links by country.** Extend the hand-off table beyond US/GB:
  AU (BOM), CA (CHS), NZ (LINZ), IE (Marine Institute), FR (SHOM), ES
  (IHM), PT (IH), DE (BSH), NL (RWS), DK (DMI), NO (Kartverket), JP
  (JMA), ZA (SAN Hydrographic), IN (Survey of India), BR (DHN). Country
  comes from the geocoder (`country_code`); device location has none →
  pick by nearest NOAA station (US) else generic.
- **Model vs official.** When the place uses the model and a NOAA station
  is 15–40 km away, add a line "NOAA at <station>, 22 km: high 11:12,
  ours 11:00" once per day — makes the model's honesty visible.
- **Error note.** One sentence in the About panel and on the source line
  for the model path: "Open-coast estimate; harbours and estuaries can
  differ by 20–40 cm and 20–30 min."
- Acceptance: no coast in the world sees "your national tide tables"
  without a link if a public one exists.

### Phase 12 (post-v2, optional) — Sound

One slow tone following the place's height, off by default, a word
control "Listen". Only after everything above; the brief keeps it out of
v2 proper.

---

## 5. Decisions already made (do not reopen)

- The globe stays as the second screen, not the first, on phones.
- Heights: MSL default, chart datum optional (phase 8). Never mix on one
  curve.
- Curves are hairlines with labels, no axes, no gridlines, no fill.
- No icons beyond the moon; daylight vs night is expressed by colour
  weight, not glyphs.
- No weather, wind, waves, currents. Water temperature is the one
  exception because it rides on the existing call and swimmers ask for it.
- NOAA within 15 km wins over the model; the threshold stays.

## 6. Open questions for the human (answer before phase 8/10)

1. Datum default for NOAA stations: MSL (consistent everywhere) or MLLW
   (what NOAA's own pages and US charts show)? Recommendation: MLLW for
   NOAA places, MSL elsewhere, both switchable.
2. Should the phone layout keep any of the moon's view above the fold
   (a thin strip of the globe) or none? Recommendation: none; the answer
   owns the first screen.
3. Pre-gzip the field in the deploy script (touches the human-run
   script) — yes/no.

## 7. How to work on it

```powershell
# preview (story-app/.claude/launch.json has a "tide" entry; or plainly):
python -m http.server 8765 --directory C:\Users\you\Downloads\scratch-repo\webapps\apps\tide
# engine gate (network):
node scripts/tide-test-harmonics.js
# syntax:
node --check apps/tide/tide.js
# deploy (human, PowerShell, profile story-deploy):
.\scripts\deploy-app.ps1 -Name tide
.\scripts\deploy-site-root.ps1
```

Commit per phase; message references `docs/tide-art-direction.md`; append
a dated entry to `PROJECT_STATE.md`; update `apps/tide/README.md` status
and its Cost line if a new endpoint field is used. Do **not** deploy.
