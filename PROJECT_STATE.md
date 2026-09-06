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
- Next: **Phase 4 (weather)** -- Open-Meteo forecast fetch + ~1 h cache,
  the cloud veil tracking cloud % across the scrubbed night, the one-line
  verdict, and driving `conditions.turbidity` from the real cloud data
  instead of the seed. Graceful when offline (veil just absent).
- Tier 1; no runtime network beyond the two keyless Open-Meteo fetches.
  Deploy (later, human-run): `.\scripts\deploy-app.ps1 -Name tonight`.

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
