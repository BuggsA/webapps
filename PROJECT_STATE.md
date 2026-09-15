# PROJECT_STATE

Living status file. Update it when something material changes.

## 2026-09-02 -- bootstrap

- Fresh repo created at `C:\Users\you\Downloads\scratch-repo\webapps`
  (separate from the frozen `story-app` repo).
- Subagent definitions written: `builder`, `researcher`, `deployer`.
  Frontmatter format (`isolation: worktree`, comma-form `tools:`,
  `model:`) confirmed valid against current Claude Code docs.
- Hosting stack **code** written (`hosting/`): one private S3 bucket
  (OAC, versioned, RETAIN), one CloudFront distribution (URI-rewrite
  function for path prefixes, 403->404), optional account-wide $10
  budget. Landing page + 404 in `hosting/site-root/`.
- Tier 2 template copied to `reference/` from story-app.

## 2026-09-02 -- hosting stack deployed

`WebappsHostingStack` CREATE_COMPLETE in `<AWS_ACCOUNT_ID>` / `us-east-1`.
Landing page live at https://<DISTRIBUTION_DOMAIN>/

- BucketName: `<APPS_BUCKET>`
- DistributionId: `<DISTRIBUTION_ID>`
- DistributionDomain: `<DISTRIBUTION_DOMAIN>`

Also mirrored (gitignored) in `hosting/.hosting-outputs.env`, which
`scripts/deploy-app.ps1` reads.

## 2026-09-02 -- until redesign (installation-grade)

- Full 5-phase redesign per `docs/until-redesign.md` (three research
  passes -> plan -> builder -> orchestrator tuning). Fraunces + Space
  Grotesk self-hosted (`apps/until/fonts/`, ~167 KB, SIL OFL); baked
  SVG grain; OKLCH ramp; Canvas2D pyramid bloom for lights/orbit;
  a raw-WebGL fragment-shader horizon (fog + marched god-rays + ACES)
  with the Canvas2D horizon kept as the reduced-motion / no-WebGL
  fallback. Still Tier 1, no runtime network.
- **Deployed?** No -- run `.\scripts\deploy-app.ps1 -Name until`.
- Note: `.claude/worktrees/agent-a444900e1c7e95828/` is an orphaned
  builder worktree dir (git no longer tracks it; a file handle blocked
  rmdir). Gitignored; safe to delete manually later.

## 2026-09-02 -- first app: until

- `apps/until/` built by the `builder` subagent from a full spec: a
  calm single-page countdown. Three canvas visualizations (lights /
  orbit / horizon), live updates, past-event reversal, "keep this
  open" ambient mode, `localStorage` persistence. Tier 1, no network.
- Orchestrator review + fixes: mobile viewport overflow in `.setup`
  (grid track), added a data-URI favicon (no `/favicon.ico` 403 on
  CloudFront), hardened the ambient control-hide with `visibility`.
  Verified in-browser: opening screen (desktop + mobile), all three
  modes, past event, ambient.
- Landing page (`hosting/site-root/index.html`) updated to list it.
- **Not yet deployed.** Run `.\scripts\deploy-app.ps1 -Name until`,
  and re-sync `site-root/` for the updated index.

## 2026-09-06 -- second app: tonight (in progress)

- `apps/tonight/` -- the sky above you as a horizon panorama (twilight,
  moon, planets, Milky Way, bright stars; now/play/scrub; cloud verdict;
  tap for a card). Plan: `docs/tonight-build-plan.md`. Structural map
  (built to cut rebuild cost): `../tonight-app-map.md` (in Downloads).
- **Art direction LOCKED: Nocturne + two borrows** --
  `docs/tonight-art-direction.md`. Chosen from five directions. Every
  phase commit references that file; it carries a per-phase checklist.
- All six "decisions still open" in the build plan are now resolved
  (table in the art-direction doc). Astronomy: vendored
  `astronomy-engine` (`lib/astronomy.js`, 116 KB, MIT).
- **Phase 1 (skeleton): DONE, committed 3cdd073.** Location
  (device/search/remembered, tz-aware), horizon canvas + drag-to-turn,
  time model (now/play/scrub), and the sky as an OKLab colour field
  derived from sun altitude -- Nocturne (seam horizon, baked grain,
  drag-only graticule, place name in the field).
- **Chrome rework: DONE.** The bottom pill / glass blur / rounded card /
  system-sans / shadcn button pair all read as "generic AI site" -- see
  the research-backed **CHROME section** now in
  `docs/tonight-art-direction.md` (banned list, per-phase drift check).
  Rebuilt: Fraunces self-hosted for *all* chrome; time controls are a
  caption line on the field (underlined words + a hairline scrub);
  locate is a prompt written into the field, not a card; chrome colour
  derived from the live field each frame; a bottom scrim holds daytime
  legibility. No border-radius (bar the scrub knob), no backdrop-filter,
  no box-shadow. Drift check passed at day / civil dusk / deep night /
  drag / mobile.
- **Palette rework: DONE (first pass).** Research
  (`docs/tonight-palette-research.md`) + a divergent generation pass
  concluded the smooth OKLab navy->amber field still read as "AI" (violet
  midpoint, timid even ramp, flat grain, black-slab top). Replaced per the
  new **Palette** section of `docs/tonight-art-direction.md` with **E x C**:
  a *film response curve* (Ektachrome-at-dusk -- teal-lifted blacks,
  warm-neutral mids never violet, amber bloom + red halation at the
  sunward horizon) *structured* by Belt-of-Venus logic (Belt of Venus +
  Earth's-shadow bands + sun-side glow, all **azimuth-blended** so turning
  the view changes the palette). Plus: seeded per-night "conditions"
  (`hash(place|date)` -> turbidity, belt geometry, drifting mottling),
  uneven clumped grain, a +/-1-level dither tile, and `theme-color` /
  `body-bg` driven from the live zenith (fixes the top-edge seam).
  Daylight blends to a plain blue sky above -6 deg. Verified across
  day / civil dusk / Belt-of-Venus / deep night / mobile.
- **Process note added:** `docs/tonight-art-direction.md` section
  "Process -- divergent generation" -- generate wide (forcing constraints,
  quotas, non-web refs), then converge. Applies to every visual call.
- **Palette tuning pass: DONE.** The bright segment now concentrates
  toward the sun's azimuth (base scene-luminance is azimuth-weighted;
  antisolar horizon goes dark = Earth's-shadow territory) rather than a
  uniform horizon band -- turning the view genuinely changes it. Tighter
  hot halation core (additive `screen`). Faint seeded airglow / skyglow
  band at deep night (usually green, sometimes sodium). Mid-band carries a
  little more chroma + a per-night warm/cool `tempShift`. Belt of Venus
  more present, hue seeded salmon..rose. Daytime brightens toward the
  sun's side. Seam no longer lifts the antisolar horizon.
- **Test-env note:** the browser pane restores a localStorage snapshot on
  reload (stale "Reston" place) and reports the tab `hidden` (rAF paused)
  -- test the sky by calling `enter()` + driving `frame()` manually. Not
  app bugs. A `visibilitychange` restart was added for real users.
- **Phase 2 (bodies): DONE.** Moon (position, phase, correctly-oriented
  crescent/gibbous via a terminator ellipse, lit limb faces the sun on
  screen, soft additive bloom) + the five naked-eye planets (mag-scaled
  dots, per-planet tint, visibility gated by sky darkness + magnitude,
  off-screen culled). Recomputed at 2 Hz alongside the sun. Tap-to-select
  (tap vs drag by movement < 6 px) opens a **card** -- a quiet overlay
  (hairline top rule, Fraunces, chrome colours, no box) with name /
  `alt-az` / rise-set / a rule-based advice sentence (altitude band +
  twilight visibility + rise-set proximity; moon adds a phase phrase). A
  canvas **leader line** tethers the card to the object (the Field Notes
  borrow); card and placard are mutually exclusive; empty tap deselects.
  "Twilight bands" from the plan are covered by the palette work.
  Verified desktop + mobile (moon + Mars + Jupiter pre-dawn, Lisbon).
- **Review pass (fresh model, full read of the code + docs).** Fixed:
  `riseSetFor` searched from t-6h and returned *past* events, so a body
  that rose and set earlier tonight was told "below the horizon for the
  rest of the night" even when it rises again before dawn (now: next
  rise/set from t; the advice only promises a return before this night's
  dawn); culled bodies kept a stale tap target for up to 500 ms; a new moon
  still drew as a grey disc; search results were click-only `<li>`s (now
  real `<button>`s -- keyboard-operable, per the a11y floor); arrow keys
  turn the view and Esc closes the card; the mottling regenerated 2,560
  noise samples every frame (now throttled); the dither tile re-baked on
  every conditions bake; dead `labLerp`; a step at -18 deg in `daylight()`;
  stale "Phase 1 / OKLCH" wording in the JS header, README, checklist and
  the Downloads map. Astronomy sanity-checked against real ephemeris
  (Aug 28 2026 total lunar eclipse = full moon; Sep 11 new -> Sep 6 is a
  ~22% waning crescent, as computed). Deploy-safe: no `../` refs, all
  assets inside `apps/tonight/`, one external URL (Open-Meteo geocoding).
- **Phase 3 (stars + Milky Way): DONE.** `data/stars.json` -- a 16 KB HYG
  subset (mag <= 4.0, 519 stars: RA/Dec J2000, mag, B-V, proper names for
  the bright ones), built from the d3-celestial catalogue. Drawn as
  Nocturne "dust": equatorial->horizontal is hand-rolled from
  `A.SiderealTime` + local latitude (validated within ~0.25 deg of
  astronomy-engine's DefineStar/Equator/Horizon over 26 yr of unmodelled
  precession -- fine for naked-eye dust), magnitude -> size/alpha, a B-V
  colour tint, a gentle seeded twinkle (off under reduced-motion), and a
  bloom only on mag < 1.2. Faint stars (mag > 2.2) fade with a
  `steadiness` value that eases 0 -> 1 ~0.8 s after the view stops moving
  -- "dust that resolves when you're still". The Milky Way is a stylised
  painted band: the galactic equator (from the galactic pole, J2000)
  sampled every 1.5 deg, stroked fat + round onto an offscreen with
  `lighten` (brightness varies along it -- Sagittarius peak + a Cygnus
  lobe), blurred once via `ctx.filter` and composited low with `screen`.
  Only appears from sun < -13 deg. Named stars are tappable -> the same
  card (no rise/set line for stars). ~0.3-0.5 ms/frame incl. the blur,
  desktop and mobile.
- **MW rework** (it was reading as a searchlight beam): now drawn as many
  soft overlapping "puffs" along the galactic equator (feathered on every
  edge, so it never reads as a shaft even running vertically), with a
  carved Great Rift, seeded patchy brightness, a centreline wobble, and a
  top/bottom edge-fade so it dissolves into the field rather than exiting
  frame. Composited much fainter (0.17). Still "stylised" -- final polish
  is Phase 5.
- Added a **"MAP OF THIS FILE"** index comment atop `tonight.js`. The
  standalone `../tonight-app-map.md` (Downloads) is marked historical /
  unmaintained -- git + PROJECT_STATE + the art-direction doc + that
  comment are the living record now.
- **Phase 4 (weather): DONE.** One keyless Open-Meteo call
  (`hourly=cloud_cover&forecast_days=2&timezone=auto`), cached in
  localStorage 1 h keyed by rounded lat/lon; the wall-clock hour strings
  are converted to UTC instants via `utc_offset_seconds`. `cloudAt(t)`
  interpolates the hourly series. `makeVerdict()` -> one short line from
  the dusk->dawn window: clear / mostly clear / broken cloud / cloudy /
  overcast, plus "clearing after HH" / "clouding over after HH" when it
  turns -- shown on the placard sub ("September 6 · clear tonight").
  `paintVeil()` lays a soft, lumpy, slowly drifting grey layer over the
  whole sky, coverage set by cloud % at `t` (stars show through the
  gaps). Real avg cloud nudges `conditions.turbidity` (grain re-baked) so
  cloudy nights render washier. Graceful offline: `wx` stays null -> no
  veil, date-only line, no throw. `btnNow` re-verdicts. ~0.5 ms/frame.
- **Phase 5 (the look): DONE -- v1 complete.** The palette landed earlier
  (film curve); this phase added: a faint always-on **compass hint**
  (facing letter + a horizon tick, hides while the graticule is up) plus
  a one-time "drag to turn the sky" cue that clears on first
  drag/arrow-key; **drag glide** -- a released flick carries a clamped
  velocity and eases to a stop over ~1 s (never under reduced-motion);
  a full **`prefers-reduced-motion`** sweep -- mottle + veil domain-warp
  frozen, twinkle off, glide off, dust-resolve instant, graticule snaps;
  a **responsive/touch** pass -- `overflow-y:auto` + max-height on the
  locate prompt and the result list, `<22rem` and `max-height:34rem`
  (landscape) media queries, `--sat` safe-area read into the card clamp,
  `font-optical-sizing: auto` + `font-synthesis: none`. Fraunces was
  already self-hosted from the chrome rework. ~0.2 ms/frame day, ~0.6-0.8
  ms/frame deep night; no console errors; controls verified end to end.
- **Post-v1 tweaks (per user feedback):**
  - **Cloud veil rework** -- was blobby + too opaque (erased the sky).
    Now 3-octave fbm + domain warp on a 148x96 buffer, tighter scale,
    feathered ramp; colour flipped to a pale skyglow-lit grey that
    *dims* stars (not a dark void); peak opacity ~0.5; regen rate-limited
    (~4 ms, ~4x/s). New **cloud toggle** (`btn-clouds`, a cloud glyph in
    the controls, shown only when avg cover > 12 %).
  - **Play reworked into a tap-cycle** (one button, no crowding):
    `Play` (frozen, only via scrubbing) then **Live** (tracks the real
    clock -- the new default on `enter`) -> **10m / 3m / 1m / 20s** =
    a full **24 h** cycle in that long, each **looping back to where the
    lapse started** (start at now+5 h -> loop returns to now+5 h).
    `Now` -> Live; scrub -> Play(frozen). Faint dust hides during the
    fast lapses; dusk/dawn recompute on day-change. `dtReal` clamped to
    [0, 0.05] so a clock jump / bg tab can't fling time. `PLAY_RATE`
    const removed.
  - **Telemetry added** (`apps/_shared/telemetry.js`, canonical, copied to
    `apps/tonight/telemetry.js` and loaded before `tonight.js`). Portable,
    **off by default** -- `ENDPOINT = ''` so nothing leaves the device;
    events accumulate in a capped in-memory ring only (`window.__telemetry.buf`,
    or `?debug=telemetry` to log them). **PII-free**: no lat/lon, no stable
    id -- a random per-load session id plus coarse context (viewport, dpr,
    timezone *name*, lang, reduced-motion, touch, referrer host). ~20
    `track()` calls in `tonight.js`: `located` (with a `via` source),
    `play` mode changes, `scrub`, `turn` (drag/key), `select`, `forecast`
    ok/cache/fail, `geo`/`geocode`, `clouds` toggle, `relocate`, and one
    per-session `perf` sample (median / p95 frame time + fps over 120 real
    frames). To actually collect: set `ENDPOINT` to a POST collector and
    add a line to the privacy copy. `track()` merges `base()` context
    first then caller props on top, so a metric key always wins over a
    same-named context field.
- **v1 is ready to deploy:** `.\scripts\deploy-app.ps1 -Name tonight`
  (human-run), then re-sync `hosting/site-root/` with the app listed.
- **Phase 6 (ISS passes): DONE 2026-09-06.** `apps/tonight/lib/satellite.min.js`
  (satellite.js 5.0.0 UMD, MIT, 23 KB -- vendored; 7.x dropped the UMD
  bundle, SGP4 is fixed math so the version is immaterial) +
  `data/iss-tle.json` (committed Celestrak TLE snapshot = the offline
  fallback) with a best-effort keyless runtime refresh from
  `api.wheretheiss.at` (cached ~12 h in localStorage, only accepted if the
  epoch is newer than what's held, **no location sent** -- less invasive
  than the weather call). `recomputePasses()` scans `state.t` + 26 h
  (coarse 30 s bracket -> 4 s refine), keeping windows where the ISS is
  above 10 deg, in sunlight (cylindrical Earth-shadow test against the
  J2000 Sun vector -- ~0.4 deg TEME/J2000 frame slop, immaterial), and the
  observer is past civil dusk; magnitude from range + Sun-ISS-observer
  phase angle. Draws a hairline predicted arc (chrome ink, **no glow** --
  like the graticule/leader borrows) + a peak tick/time, and a small mark
  riding `state.t` through the pass (short trail, restrained planet-grade
  bloom). Placard callout "ISS - 21:14, rises WNW -> 61 deg"; tap it to
  **play the pass** (one-shot ~11 s eased sweep of `state.t`; reduced-motion
  jumps to peak, static arc). Tap the mark -> the object card. No-ops
  entirely without the library or elements; ` - approx` suffix if elements
  are > 6 days stale. ~0.9 ms/frame (unchanged); recompute ~11 ms, deferred
  off `enter()` / `Now` / sim-day change (skipped during fast lapses).
  **Deploy note:** replace `data/iss-tle.json` on deploy to keep the
  offline path fresh (a `scripts/refresh-tle.ps1` could automate it).
- Tier 1; runtime network is now three keyless CORS-open fetches (two
  Open-Meteo + wheretheiss.at), all optional -- the sky renders fully
  offline. Deploy (human-run): `.\scripts\deploy-app.ps1 -Name tonight`.
- **Cloud toggle fix (`6f51dab`):** the button only gated `paintVeil()`;
  the forecast's turbidity bump (whole-sky haze) stayed. Now
  `bakeConditions()` stashes `seedTurb`, `applyForecast()` records
  `wxTurb` (from the seed, idempotent), `applyTurbidity()` swaps by
  `veilOn` + re-bakes grain, and the button calls it -- so the toggle
  reads as "show the clear sky". Each new place resets `veilOn = true`.

## 2026-09-10 -- house rules doc for new apps

- **`docs/building-a-new-app.md`** added -- the briefing doc to hand a
  builder (AI or human) alongside a per-app brief. Distilled from `until`
  + `tonight`: the stable constraints (Tier 1, self-contained folder,
  keyless/CORS/optional network, privacy posture, human-run deploy, the
  a11y floor), the process that worked (research -> art-direction pass +
  locked doc *before code* -> phased plan -> doc discipline), a
  definition-of-done checklist, and an app-brief template. `README.md`
  layout + status lines refreshed to match reality (`apps/_shared/` holds
  portable modules like `telemetry.js`, not a shared stylesheet; two apps
  built).


## 2026-09-10 -- third app: tide (groundwork, no code yet)

- **What it is.** The moon moving the ocean on a globe seen from the
  moon's point of view, plus the next high/low water at your place. Chosen
  2026-09-10 over Rivers (national gauge data, tiles, river topology),
  Quakes (wonder but no daily utility) and a beautiful whatismyip (thin,
  single-visit) for: deepest wonder, daily utility for anyone near a
  coast, ad-landfill incumbents, and Tier 1 with zero exceptions.
- **Research verified (curl, CORS headers checked):**
  `docs/tide-data-research.md`. Open-Meteo Marine
  `sea_level_height_msl` is global, keyless, CORS-open, 15-minutely,
  -92 d..+15 d, matches NOAA Boston to within hourly sampling (~7 % low in
  amplitude). NOAA CO-OPS predictions + harmonic constants keyless +
  CORS (3,499 stations). EOT20 global tide model is CC BY 4.0 -- shipped
  downsampled to 1 deg for the globe field. astronomy-engine already
  vendored in Tonight. Inland points still get a series from Open-Meteo,
  so the app needs its own distance-to-coast guard.
- **Docs written:** `docs/tide-brief.md` (filled template),
  `docs/tide-art-direction.md` (five directions, "Under the Moon"
  recommended -- **pick pending, not locked**), `docs/tide-build-plan.md`
  (phases 0-5, decisions resolved, risks).
- **Next:** human picks the art direction and flips the status line to
  LOCKED; then phase 0 (data-prep scripts + tide maths gated on the NOAA
  comparison test). No code in `apps/tide/` before the lock.

## 2026-09-10 -- tide built (phases 0-5), not deployed

- **Art direction locked** the same day: "Under the Moon" (camera at the
  sub-lunar point; the Earth turns under the bulge; sea height as
  luminance of one hue; readout as table rows). `docs/tide-art-direction.md`.
- **Phase 0.** `apps/tide/lib/harmonics.js` (Doodson arguments + Schureman
  nodal corrections, 37 constituents) passes the NOAA gate in
  `scripts/tide-test-harmonics.js`: Boston / Pensacola / San Francisco
  turning points within 12 min and 0.05 m using NOAA's own constants
  (Anchorage is informational -- NOAA uses 83 shallow-water constituents
  there). EOT20 downloaded from SEANOE (2.3 GB outer zip, nested
  `ocean_tides.zip`; the server ignores HTTP Range) and reduced by
  `scripts/tide-prep-field.py` to `data/tide-field.bin` (1° grid, 8
  constituents, 1.56 MB raw / 693 KB gzipped; amplitude outliers clipped
  at the 99.95th percentile). Natural Earth land -> `data/land-110m.json`
  (66 KB) + `data/land-50m.bin` (248 KB); NOAA station index 241 KB.
- **Phases 1-4** in `apps/tide/` (`index.html`, `tide.css`, `tide.js`):
  Canvas 2D orthographic globe with a per-pixel low-res pass (sea
  luminance from the field, land mask from vector rings, day/night with a
  warm terminator edge, moonlight lift), rings pre-converted to unit
  vectors + cap culling + Sutherland-Hodgman clipping so a frame is
  ~10-20 ms; drag with ease-back to the moon's view; wheel/pinch/dbl-tap
  zoom; fly-to-place; readout (state line, four turning points, range,
  springs/neaps, moon, sun, source, hand-off); Open-Meteo 15-minutely
  series everywhere, NOAA hi/lo when a station is within 15 km (MLLW
  minus the hi/lo mean, since subordinate stations have no MSL datum);
  inland grace; localStorage caches; scrub -3 d..+15 d; Play at 1 h/s;
  About panel; keyboard (Space, Esc, M, +/-); reduced-motion path;
  narrow layout (controls wrap to two rows, moon disc top-right).
- **Verified in the in-app browser** at 319x944 and 1280x800: NOAA path
  (Wildwood NJ), model path (Brighton UK), fresh-launch prompt, About,
  Play, drag, zoom. `node --check` clean.
- **Deployed 2026-09-13** by the human at
  `https://<DISTRIBUTION_DOMAIN>/tide/` (all files 200; the field
  .bin is served uncompressed at 1.55 MB because CloudFront does not gzip
  `application/octet-stream`). The landing page was **not** re-synced yet
  (`.\scripts\deploy-site-root.ps1`) -- it still lists only Until.
- **2026-09-13 fix, needs a redeploy:** the live view showed land and sea
  swapped when Antarctica straddled the limb -- a ring spanning all
  longitudes, clamped to the rim, swept the whole disc and flipped the
  even-odd land mask. The projected mask is gone: land is now a 0.125°
  lat/lon raster built once from the rings (`buildLandMask`) and sampled
  bilinearly per pixel (soft coast), which also removed the mask cost.
  Per-pixel asin/atan2 replaced by ~1e-6-rad polynomial approximations;
  pixel budget 90k. Frames: ~18 ms at planet scale and at coast zoom on
  this machine.
- **Still not done:** a real-phone performance pass; official-table links
  beyond US/GB; optionally pre-gzipping `tide-field.bin` (deploy-script
  change: upload with `Content-Encoding: gzip`).

## 2026-09-13 -- tide redeployed with the limb fix; v2 plan written

- Human redeployed `tide` (commit `ed61b14`, verified live: `tide.js`
  contains `buildLandMask`) and re-synced the landing page (Until,
  Tonight, Tide all listed).
- **Assessment:** v1 is the picture; the readout is too thin for people
  who use tides (no today curve, no week, no chart datum, no rate, no
  daylight windows, globe first on phones). Written up as
  **`docs/tide-v2-plan.md`** -- a cold-start handoff (file map, how
  tide.js works, verified numbers, gotchas already paid for, the critique
  by user type, phases 6-11 with files/acceptance, decisions not to
  reopen, three open questions for the human, how to work). The model
  working on this is about to change; that doc is the entry point.
- **Next:** phase 6 (today's curve) and phase 7 (the week) first, ship,
  then 8-11.

## 2026-09-15 -- tide phase 6 (today's curve), not deployed

- Model switched mid-session (Fable 5.1 -> Sonnet 5); picked up
  `docs/tide-v2-plan.md` phase 6, the highest-value gap: a 36 h sea-level
  curve in the readout (state.t -6h..+30h), night-washed, turning points
  labelled, a draggable "now" mark. `apps/tide/index.html` +`.ro-curve` in
  `tide.css` + a new CURVE section in `tide.js` (`sizeCurve`,
  `nightBands`, `paintCurve`, `updateReadoutLite` + pointer-drag).
  aria-hidden: purely a pointer enhancement over the already-accessible
  rows and the keyboard scrub.
- **Two real bugs found and fixed while testing, not just eyeballing
  screenshots:**
  - Same-type turning points (~12h25m apart) collided into unreadable
    overlapping label text in the curve at typical widths (320-340px).
    Fixed with per-row (above/below) collision tracking that drops a
    label rather than let it overlap -- verified by re-rendering and
    checking the pixels, not just looking.
  - **Pre-existing v1 bug**, found via the phase-6 short-viewport
    acceptance test: the max-height:34rem rule meant to hide the moon/sun
    lines targeted `.ro-sun, .ro-moon`, but those elements only carry
    `id="ro-sun"`/`id="ro-moon"` (class is `ro-line`) -- the rule never
    matched anything. Fixed to `#ro-sun, #ro-moon`. Verified with a
    pixel-level readback (`getComputedStyle(...).display`) at 420px
    height, and that the full readout now fits 320x690 / 375x560 /
    375x480 / 375x420 with zero scroll.
  - Also verified with real pixel reads (not screenshots) that the night
    wash actually paints (alpha ~0.30 at night x-positions, 0 at day).
- Verified on both series sources (NOAA hi/lo at Wildwood NJ, Open-Meteo
  15-min at Brighton UK); drag-to-scrub moves `state.t` and the globe
  follows; `paintCurve()` costs ~1.1 ms/call; `node --check` clean.
- **Not deployed.** `docs/tide-v2-plan.md` phase 6 marked done with the
  detail above. **Next:** phase 7 (the week).

## 2026-09-16 -- tide: on-demand Detail panel (panel-research Option C), not deployed

- User confirmed the recommendation from `docs/tide-panel-research.md`:
  Option C, hybrid. Built the same day.
- The readout's permanent glance is now just rule + place + state +
  curve. Everything that scales with more data -- the remaining turns,
  range/springs, moon, sun -- moved behind a `.word`-styled "Detail" /
  "Less" toggle (`#btn-detail` -> `#ro-detail`), collapsed by default,
  built on the exact `hidden` + `aria-expanded` shape the About panel
  already used. Source and the hand-off line stay outside it, always
  visible (safety-adjacent text shouldn't be opt-in).
- `sizeDetail()` measures the real gap to the controls bar and caps the
  panel's height to it (min of that and 70svh), so it is provably unable
  to push content off-screen, on any viewport -- not a guess. It scrolls
  internally (styled as a 3px hairline in `--chrome-line`, not the
  browser's default grey bar) rather than the old media query's silent
  truncation, which is now removed as redundant.
- `layout()`'s phone-only "shrink the globe below the readout" branch
  now only applies while Detail is closed; open, it overlays the globe
  translucently like `#about`/`#locate` already do, since there usually
  isn't room for both on a short phone.
- Escape closes Detail (added to the existing Escape chain); closing it
  any way returns focus to the toggle, matching `showAbout()`.
- **Verified**, not just built: default-collapsed state fits 320x690,
  375x560, 375x480 and 320x500 with zero page scroll (checked
  `document.body.scrollHeight === innerHeight` directly); both NOAA and
  Open-Meteo data paths; Detail's measured max-height never exceeds the
  controls bar's top edge; Escape + focus-return confirmed.
- **A real testing-environment bug found and fixed along the way** (not
  an app defect): the long-running local preview server plus the
  browser's HTTP cache meant `fetch('index.html', {cache:'reload'})` was
  busting the wrong cache key (`/index.html`, not `/`, which is what the
  page actually loads from) -- several apparent crashes mid-session were
  stale pre-Detail markup paired with current JS, confirmed by reading
  what the browser actually received over the network, not by curl
  (which was hitting the live file correctly the entire time and was
  the misleading signal). Detail in `docs/tide-panel-research.md`.
- Not deployed. `node --check` clean.

## 2026-09-16 -- tide: relief shading + tracked moon marker, not deployed

- Built docs/tide-visibility-research.md items 1-3: raking-light relief
  shading on the sea (a real slope of the tide field, dotted against the
  direction of increasing sunlight -- peaks at the terminator, vanishes
  at local noon/midnight, no legend, no new colour) and the moon icon
  as a tracked off-screen-indicator marker (driven by moonCam, already
  computed for the moonlight-lift term) instead of fixed chrome, plus a
  confirming hairline from the marker to the sub-lunar point.
- User pushed back on the first pass at the moon fix ("is this the best,
  not just the cheapest") -- the static hairline-only idea was replaced
  before building anything, in favour of the tracked marker (see the
  doc's history). Built the better idea, not the cheap one.
- Calibrated the relief gain against real sampled data (median/p90/max
  of the raw term across every near-terminator open-ocean cell on a real
  load), not guessed. Caught and fixed a real bug in the same pass: the
  clamp was applied before the gain instead of after, doubling the
  intended range.
- Caught and fixed a real layout bug: the moon marker is a live 44px hit
  target (not just a drawing) and could land on the readout's text on
  narrow phones, silently stealing taps. Fixed with a feasibility-checked
  push, verified by sweeping the drag angle at 320px width with zero
  collisions against the state line, turns, and Detail toggle.
- Verified: frame cost unchanged (~18.5 ms); drag-and-release swings the
  marker out and eases it back with the camera; alpha correctly fades
  toward a floor (never a hard vanish) when the moon is below the
  horizon at a zoomed place, checked against Brighton's real moonset
  time; reduced motion inherited for free (the marker only reads
  cam/moonCam, which stepCamera() already snaps under REDUCED).
- Not deployed. `node --check` clean. Limb wobble and the moon-glade
  shimmer remain research only (item 4), not built.

## 2026-09-17 -- tide: Detail button dead on the live site, fixed

- User reported the Detail toggle wasn't working after deploy. Reproduced
  with a real click on the live site (not a JS-triggered `.click()` --
  the diagnostic that mattered): `#btn-detail` had computed
  `pointer-events: none`, inherited from `.readout`'s blanket
  `pointer-events: none` (so the globe underneath can be dragged through
  the chrome). Every other interactive child of `.readout` --
  `.ro-curve`, `.ro-src a`, `.ro-detail` itself -- has its own
  `pointer-events: auto` override; `.ro-detail-toggle` was missing one,
  a straight oversight when it was added.
- **Root cause of why this passed testing before deploy:** all local
  verification of Detail used `el.btnDetail.click()` from
  `javascript_exec`, which calls the click handler directly and never
  goes through real hit-testing/pointer-events -- so a real mouse click
  landing on a `pointer-events: none` element (falling through to the
  globe canvas underneath) was never exercised. Lesson: a programmatic
  `.click()` proves the handler works, not that the element is
  clickable. Real click tests are the ones that catch this class of bug.
- Fixed: added `pointer-events: auto` to `.ro-detail-toggle`. Verified
  with an actual mouse click (not `.click()`) against a real place, both
  before (reproduced: no state change, `elementFromPoint` at the
  button's centre returned the globe canvas, not the button) and after
  (fixed: click opens the panel, toggles to "Less").
- Redeployed by the user; confirmed live.

## 2026-09-17 -- tide: long-press to set your place, not deployed

- Built the recommendation from `docs/tide-tap-select-research.md`:
  hold a finger/mouse on the globe (~550ms, tolerating ~8px of drift)
  and it snaps through the existing `nearestCoast()` to the nearest
  coast, shows a tethered, non-modal preview card (Tonight's `.card`
  shape -- hairline, no box), and only becomes the saved place on an
  explicit "Use this place". A plain tap or a drag is unaffected --
  the long-press timer is cancelled the moment movement exceeds the
  slop, or on release, so the existing pan/tap behaviour didn't change.
  Not a toggle: no mode to forget, per the research doc's Raskin
  citation.
- New `unproject(px,py)` factored out of `zoomBy`'s inline screen ->
  lat/lon math (behaviour-preserving refactor, same fallback when the
  point misses the globe).
- Reverse geocoding via BigDataCloud's `reverse-geocode-client`
  (keyless, CORS-open, confirmed in the research doc): remote coasts
  often return a "exclusive economic zone of ..." locality instead of a
  real place name, so that's filtered out in favour of
  subdivision+country, then a plain "This coast" fallback.
- **Verified the click-through lesson from the Detail bug applies here
  too:** `.pick-use` needs its own `pointer-events: auto` since
  `.pick-card` is `pointer-events: none` like `.readout`/`.card`. Set
  it from the start this time, but still verified with a real
  `computer` click (not `.click()`) on both desktop and mobile widths,
  not just the JS-dispatched long-press gesture used to open the card.
- Tested: long-press opens + resolves a name; drag past the slop pans
  normally with no pick; a quick tap elsewhere dismisses an open pick;
  Escape dismisses; the preview auto-cancels if its point rotates past
  the limb; committing flies to the place, loads its tide series, and
  updates the readout -- all via real synthetic PointerEvents (not
  direct handler calls) plus a real mouse click for the commit button.
- Deployed by the user; confirmed live against the production URL with
  a real click (not `.click()`) committing a picked place end to end.

## Not done yet

- **Credential envelope -- confirm.** DEPLOY.md step 0 (rename
  `[default]` -> `[story-deploy]`) needs to be verified done: open a
  fresh PowerShell with `AWS_PROFILE` unset and check
  `aws sts get-caller-identity` fails. That's the environment
  `Bash`-capable subagents run in.
- **Budget alarm** only exists if `-c alert_email=...` was passed to
  the deploy.

## Verified live 2026-09-02

- `/` serves the "small things" landing page.
- `/does-not-exist/` serves `404.html` (URI-rewrite function + 403->404
  error mapping both working).

## Known machine gotchas (from docs/SYSTEM_PLAN_NOTES.md §6)

- `aws` not on PATH -> `C:\Program Files\Amazon\AWSCLIV2\aws.exe`.
- Run `aws`/`cdk` from PowerShell, not Git Bash.
- CDK needs the venv python first on PATH; system Python 3.10 lacks
  `aws-cdk-lib`.
- `JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1` (Node 26).
- Account <AWS_ACCOUNT_ID> / us-east-1 already CDK-bootstrapped.

## 2026-09-17 -- tide: phase 7, the week

- Built docs/tide-v2-plan.md phase 7: inside Detail, right after the
  existing next-4-turns list, the next 7 days grouped by calendar day
  (weekRows()), collapsed to today+tomorrow with a "This week" word
  control, plus a 14-day lowest-low/highest-high summary line
  (extremes14()). Reuses the existing .ro-turns row markup/CSS for each
  day's rows rather than inventing a new style.
- Verified against both data paths (Open-Meteo model turns and NOAA
  hilo turns) and at desktop + mobile widths; expand/collapse tested
  with real clicks, not `.click()`.
- Deployed by the user alongside phase 8; confirmed live.

## 2026-09-14 -- tide: phase 8, datum/units/rate

- Built docs/tide-v2-plan.md phase 8: a datum toggle (mean sea level /
  chart datum MLLW) and a units toggle (m/ft), both persisted, plus a
  rate line ("0.4 m in the next hour", + "fastest part of the tide"
  near a half-cycle's midpoint) on the state line when rising/falling.
- **Spec correction found live:** NOAA's `datums.json` endpoint the plan
  named is retired (404s, redirects to the Metadata API). Turned out
  unnecessary anyway -- NOAA predictions are already fetched with
  `datum=MLLW` and re-centred by subtracting the window's own mean
  (pre-existing code); that mean is the *exact* offset back to MLLW, so
  the toggle reproduces NOAA's own numbers algebraically. Only the
  Open-Meteo/model path is a real estimate (92-day past_days call,
  mean of each day's lower low), labelled "estimated" accordingly.
- **Bug found and fixed before it shipped:** a NOAA series cached before
  this phase (no `mllwOffset` field) would never self-heal -- the async
  backfill path only covers the model path, since NOAA needs no extra
  fetch. Fixed with a cache-key version bump (`:v2`) so stale entries
  are cleanly bypassed rather than silently showing MSL numbers under
  an MLLW label.
- Every height on the page routes through one function (`heightNum()`)
  for the datum shift, so state line / curve labels / turns / week rows
  all follow the setting without individually knowing about it. Range
  and the new rate line are left alone -- both are differences, and a
  constant datum offset cancels out of a subtraction.
- Deployed by the user; confirmed live with a real click toggling the
  datum on the production San Francisco/NOAA station.

## 2026-09-14 -- tide: phase 9, daylight windows/water temp/calendar, not deployed

- Built docs/tide-v2-plan.md phase 9: "Low/high water in daylight" lines
  (next 3 of each, filtered by real civil twilight via astronomy-engine's
  SearchAltitude -- went with the precise option over the plan's rough
  sunrise+/-30min fallback, since the library already had it); sea
  surface temperature on the sun line (model path only, converts to F
  when units=ft); an "Add to calendar" .ics export (14 days of turns as
  0-minute events + one dawn-to-dusk span event per day whose twilight
  window contains a low).
- Verified by inspecting the generated .ics text directly (the preview
  sandbox blocks real downloads, as the plan itself warns) -- well-formed
  on both data paths; real click (not `.click()`) on the button at
  desktop and mobile widths.
- **Bug caught before shipping (same class as phase 8's):** a model-path
  series cached before seaTemp existed would never pick it up, since it's
  part of the one fetch rather than a separately-backfillable field like
  mllwOffset. Fixed with a `:v2` bump on the model cache key too.
- Deployed by the user; confirmed live (sea temp + daylight lines +
  a real click on "Add to calendar", no console errors).

## 2026-09-14 -- tide: phase 10, layout for use + first paint + places, not deployed

- Built docs/tide-v2-plan.md phase 10, the biggest restructure of the
  three remaining phases:
  - **Real phone scroll.** New #globe-wrap div hangs the canvas/moon-
    marker/pick-preview off one positioned box: fixed+inset:0 by default
    (desktop and onboarding, pixel-identical to before), switched to a
    normal-flow aspect-ratio:1 square only via
    `body:has(#readout:not([hidden]))` at <=40rem -- true exactly when
    state.located, so onboarding/"Just look" keeps its old fixed-overlay
    layout untouched. resize() now reads the canvas's own
    getBoundingClientRect() instead of window.innerWidth/innerHeight.
    layout()'s old "phones: globe below readout" shrink hack is dead
    code with real scroll and was removed.
  - **First paint.** init() starts the frame loop before awaiting
    loadLand(), then (for a returning visitor) awaits enter() -- which
    dispatches the series fetch -- before calling loadField(). Verified
    via performance.getEntriesByType: land starts ~49ms, field ~458ms,
    a real gap.
  - **Pre-gzip.** deploy-app.ps1 gzips any apps\<name>\data\*.bin after
    the s3 sync and re-uploads with --content-encoding gzip (generic,
    not Tide-specific). Verified locally: tide-field.bin 1519KB->672KB,
    byte-identical round-trip. Documented in docs/DEPLOY.md.
  - **Up to 3 saved places.** localStorage 'tide.places' (migrated once
    from the old single-place key), MRU-first, capped at 3 by
    rememberPlace() (called from every enter() path). The place name
    (#ro-place, now <h1><button>) cycles them; a no-op when only one is
    saved.
- **Tool limitation encountered (not a code bug):** this session's
  `computer` click tool intermittently reports a click coordinate that
  doesn't match where the real DOM click event actually fires --
  reproduced on stock example.com and against the unchanged Detail
  button, so it's environmental. Also separately reproduced: large
  custom viewport sizes (1280x900, 768x1024) render the globe confined
  to a small corner even on the live unmodified production site -- a
  pre-existing rendering artifact of this test tool at those sizes, not
  a Tide bug. Fell back to elementFromPoint() (the browser's real hit-
  test) + a properly-targeted synthetic event at the verified point,
  weaker than the real clicks used in phases 6-9 but the strongest
  check available once the click tool itself was shown unreliable.
- Deployed by the user alongside the phone-layout revert and the
  Hide-text control below; confirmed live.

## 2026-09-14 -- tide: phase 10's phone layout reverted after real-phone testing

- User tested phase 10 live on their actual phone: "It is deployed but
  it seems a whole lot worse than before. The information part is not
  transparent, The viewing window got smaller on the phone." Both real,
  both a direct consequence of the real-scroll restructure, not a bug
  in it -- moving the readout into normal flow above a separate globe
  box put it on the plain page background instead of over the globe,
  losing the "words written onto the field" transparency the art
  direction depends on; capping the globe to a viewport-width square
  is smaller than a globe that could use the full screen height.
- Reverted in commit fb2359b: #globe-wrap and the
  body:has(#readout:not([hidden])) media query removed;
  #globe/.moon/.pick-card back to position:fixed; layout()'s original
  "phones: globe below the readout" shrink-to-fit branch restored;
  resize() back to window.innerWidth/innerHeight. Verified in a fresh
  browser tab (the reused tab was showing a stale/confined render, a
  known test-tool artifact -- see
  testing-tool-click-coordinate-bug in Claude's memory) that the globe
  and transparent readout overlay are back to the pre-phase-10 look at
  both mobile and desktop widths, console-clean.
- First paint and up to 3 saved places (the other two pieces of phase
  10) were untouched -- the phone complaint had nothing to do with
  either -- and stay in place.
- Deployed by the user alongside the Hide-text control below;
  confirmed live.

## 2026-09-14 -- tide: a "Hide" control for the text

- User request after seeing the reverted layout live: an option to
  make the readout text disappear completely and just look at the
  globe. Added a "Hide"/"Show" word control (commit 11a6532) to the
  always-visible controls bar, toggling a `.force-hidden` CSS class
  (not the `hidden` attribute -- showAbout() already borrows that for
  "one column of words at a time" and restores it on close, which
  would silently undo this; verified opening/closing About while text
  is hidden leaves it hidden). paintScrim() also checks the new flag,
  otherwise a pointless dark patch would sit over the globe where the
  text used to be. Not persisted -- resets to visible on next visit.
- Verified real hit-testing + targeted dispatch (the click tool itself
  is unreliable this session -- see testing-tool-click-coordinate-bug)
  at both mobile and desktop widths, in a fresh tab: the globe now
  fills the entire screen with zero text when hidden, and toggles back
  correctly.
- Deployed by the user; confirmed live with a real hit-test + targeted
  click against production (readout correctly goes to `display:none`).

## 2026-09-14 -- tide: phase 11, trust and coverage, not deployed

- Built docs/tide-v2-plan.md phase 11: official tide-table links for 15
  more countries (AU/CA/NZ/IE/FR/ES/PT/DE/NL/DK/NO/JP/ZA/IN/BR) beyond
  the existing US/GB, every URL web-searched and checked live before
  going in (a wrong safety-hand-off link is worse than the generic
  fallback it replaces). IN uses INCOIS rather than the plan's literal
  "Survey of India" -- that agency doesn't run a public tide service,
  INCOIS does. Device-location entries (no geocoded country) infer US
  when a NOAA station is nearby, else fall back to the generic phrase.
- Model-vs-NOAA honesty line: when the model path has a real NOAA
  station 15-40km away, fetches just its hi/lo times (cached a day at
  a time) and shows "NOAA at <station>, X km: high/low <time>, ours
  <time>" -- but only when the model's own next turn has a same-type
  match within 6h of the station's, so a genuine mismatch (tested for
  real near Port Fourchon, LA -- Louisiana's complex tides put the
  model's next low within 22 min of the station's next HIGH, a
  half-cycle mismatch) correctly shows nothing rather than a
  misleading pairing. Verified the matching arithmetic itself with
  synthetic same-type and >6h cases.
- Error note ("open-coast estimate; harbours/estuaries can differ by
  20-40cm and 20-30min") tightened into the About panel (which already
  had a looser version from v1) and added fresh to the always-visible
  source line for the model path only -- :empty-collapses to nothing
  on the NOAA path.
- attachMLLW() renamed attachExtras(), now backfills both mllwOffset
  and the new cmp field independently, so a series cached before this
  phase self-heals on next load with no cache-key version bump needed.
- **Not yet deployed** -- needs `.\scripts\deploy-app.ps1 -Name tide`.

## 2026-09-15 -- tide: phase 12 (optional), sound -- v2 plan complete

- Built docs/tide-v2-plan.md phase 12, the last item on the roadmap: a
  single Web Audio sine oscillator, one octave (160-320Hz), mapped
  against the PLACE'S OWN loaded height range (not a fixed scale) so a
  few cm in the Mediterranean and several metres in the Bay of Fundy
  both use the full register. Pitch glides toward the current height
  via setTargetAtTime (2.5s time constant) every frame rather than
  jumping -- "slow" is a property of the tone itself. AudioContext
  created lazily on first "Listen" click (autoplay policy needs a real
  gesture anyway); gain fades in/out over 0.4-0.6s, no click. "Listen"
  <-> "Quiet" word control in the controls bar, off by default,
  untouched by anything else on the page.
- Verified the frequency formula by hand against real place data; the
  glide itself by freezing time (setMode('hold') -- live mode's own
  state.t=Date.now() every frame would otherwise fight a manual time
  jump in the test) and confirming ~80% of the gap closed after ~1.6
  time constants, matching the exponential model to the percent; real
  hit-test-verified clicks starting/stopping the tone at both mobile
  and desktop widths, AudioContext reaching "running", no console
  errors.
- **This closes out docs/tide-v2-plan.md.** Every phase (6-12) is now
  either live or was built-and-deliberately-reverted with the reasons
  recorded (phase 10's phone layout). Updated the plan doc's top status
  line to reflect this and point at the per-phase notes for the record
  of what shipped, what didn't, and why.
- **Not yet deployed** -- needs `.\scripts\deploy-app.ps1 -Name tide`.

## 2026-09-15 -- ip: a fourth app, and phase 1 (the gate) passes

- New app from the user's own idea document ("What's My IP") plus four
  reference stills. Compressed into the house brief template
  (docs/ip-brief.md); their text treated as intent, not spec.
- Data layer VERIFIED LIVE before anything was written down
  (docs/ip-data-research.md): RIPEstat is keyless and sends
  Access-Control-Allow-Origin: *, and RIS Live's WebSocket returns 101
  with a foreign Origin, so both are reachable from a static page.
  Team Cymru's IP-to-ASN is DNS/whois only and is NOT usable from a
  browser, which the source document had assumed; Cloudflare Radar needs
  a token; IODA is academic-licensed. RIPEstat + RIS Live is the whole
  data layer and both are free.
- Architecture: Tier 1 plus ONE CloudFront Function reading
  event.viewer.ip at viewer-request, so `curl` gets plaintext off the
  edge and the page stays static in S3. Rejected a third-party echo
  (sends every visitor to a company with nothing to do with the site)
  and Tier 2 (a Lambda cold-start tail on the one thing that must never
  feel slow). Cost: the browser needs JS for the number.
  **This is the first app that needs a `cdk deploy` of hosting/ rather
  than only an `s3 sync`** -- it breaks the system's standing promise
  that adding an app never touches the stack. Flagged to the user.
- Privacy: every RIPEstat lookup is deferred until the visitor moves past
  the answer, so an arrive-copy-leave visit talks to nobody but us and
  "no IP history stored" needs no footnote.
- Art direction: five directions generated (Cordage / Suminagashi /
  Chladni / Watermark / Daylight Register), user picked the recommended
  **Cordage** -- Ruth Asawa's hanging looped wire, quipu, Anni Albers.
  Containment drawn as suspension, the address as a knot, a natural-dye
  palette selected by ASN, motion only ever driven by a measured number.
  The user's own reference stills were explicitly treated as MOOD, not
  direction: near-black + blue bloom + particle bokeh is the current
  AI-render median and two apps in this series are already dark fields,
  so bloom/bokeh/blue-black are on the banned list. LOCKED in
  docs/ip-art-direction.md.
- **Phase 1 (the gate) built and passed.** The user's own gating
  assumption -- "the generator must never be ugly" -- got a harness
  rather than a page: apps/ip/lib/{form,dyes}.js plus
  scripts/ip-contact-sheet.html (dev-only, kept OUT of apps/ip/ so it is
  never synced), with four corpora including a sparsest-only floor mode
  and a one-network ancestry mode.
- It failed twice before it passed, which is what the gate is for.
  (1) First sheet: every form was the same object at the same size --
  the outermost cage was always the IANA /8 so prefix length changed
  almost nothing. Fixed by making the ANNOUNCED PREFIX the object you
  look at, sized by its length, with containing blocks scaled by the log
  of the real size ratio so they crop off-frame (you are inside them and
  cannot see all of one), plus per-address aspect variation.
  (2) Second sheet: rings drawn at one weight all the way round made the
  form read flat, and the knot -- a scaled copy of the cage -- came out
  looking like the atomic-energy logo. Fixed with near/far ring halves at
  different weights, and a real overhand knot drawn as one cord looped
  through itself with a proper over-and-under (a ground-coloured gap
  stroked under the crossing strand).
- Verified on the sheet: the floor (one cage, no ASN, no latency, fully
  frayed) is restrained and good, not impoverished; ancestry reads --
  same dye, same twist, same cord make, different proportion and knot
  angle, so siblings without being clones; and the reduced-motion still
  is as good as the moving frame (pulse frozen at a composed phase).
- Next: phase 2, the answer itself (page + edge function + dev stub).
  Nothing deployed; nothing in apps/ip/ is production yet.
