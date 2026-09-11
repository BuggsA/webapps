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
