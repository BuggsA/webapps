# Tide — panel/overlay research: visible but not blocking

Research only, per the user's request ("just do some research first"). No
code changed. This is input to `tide-v2-plan.md` phase 10 ("Layout for
use") and to phases 7–9 as they add more to the readout — read this
before building any of them, because it changes the shape of the answer,
not just its styling.

## 1. The actual problem, stated precisely

Tide's readout (`apps/tide/index.html#readout`) is **always fully
expanded**: place, state line, curve, up to four turns, range, moon, sun,
source, hand-off — nine to eleven rows, all shown all the time, fixed at
the top-left. On a short phone (see `tide-build-plan.md`'s own
`max-height: 34rem` breakpoint, and the phase-6 testing in
`PROJECT_STATE.md` that had to fit content into a 420px-tall viewport)
this is most of the visible screen. The globe — the thing that makes
Tide worth opening — gets pushed into a sliver.

Compare this to Tide's own sibling app: **Tonight never shows this
much at once.** Its object card (`apps/tonight/tonight.css` `.card`,
`apps/tonight/tonight.js` `openCard`/`pickObject`) is compact (four
lines: name, position, rise/set, one sentence of advice), appears only
when something is tapped, is tethered near the tapped object rather than
pinned to a corner, and disappears again. Tonight solved "lots of
potential information, small screen" by **never showing more than a
glance's worth by default.** Tide's readout currently does the opposite:
it shows the full detail permanently. That is the actual bug — not a
missing "panel component," but a violation of the same progressive-
disclosure principle the art direction already lives by everywhere else
on the globe (the graticule only shows while dragging, in Tonight; the
leader line only shows on selection). The fix is a UI *pattern* decision,
not a purely cosmetic one, so it is worth grounding in how other people
have solved exactly this before choosing an approach.

## 2. Precedents inspected live (not just described)

### earth.nullschool.net — the closest visual cousin

[earth.nullschool.net](https://earth.nullschool.net) draws a live global
wind/ocean visualization on a spinnable globe — no basemap chrome, no
UI-kit look, pure field-and-type, the same instinct as Tide's "Under the
Moon" direction. Checked at both desktop and 375×700:

- **Default state has almost no chrome at all** — just a small "earth ☰"
  wordmark bottom-left. No panel, no summary, nothing pinned. The globe
  owns the whole screen.
- **Tap a point on the globe** → a two-line readout appears bottom-left:
  coordinates, then `Wind | 95° @ 26 km/h`, in plain type on a *very*
  faint dark wash behind it (not a bordered card, no shadow — just
  enough contrast to read), with a small `×` to dismiss. It occupies
  roughly 80px of height and nothing else moves or resizes.
- **The full settings menu (date, data layer, source, colour scale,
  overlay controls)** — far more content than Tide's readout — is
  **hidden until the hamburger is tapped**, then rises as a translucent
  panel with hairline dividers between labelled sections (`Date`,
  `Data`, `Source`, `Scale`, `Control`), scrollable, dismissible. It can
  get tall, but it is opt-in: nobody sees it who didn't ask for it.

This is the strongest evidence that **"boxless" and "doesn't block the
screen" are compatible** — nullschool has *more* data than Tide's
readout and shows *less* of it by default.

### Windy.com — labels painted on the surface + a dismissible detail sheet

[windy.com](https://windy.com), checked at 375×700:

- Per-city temperatures are painted **directly onto the map** as plain
  numerals with a place name (`Denver 82°`), not in a side panel at all.
  This is a genuinely different way to answer "give people data without
  a panel": put small facts *on* the field itself, the way Tide's own
  turning-point labels on the new curve already do.
- Tapping a place opens a **dismissible overlay sheet** (explicit red
  `×`, top-right) that *does* take most of the screen — five-day
  forecast, hourly table, wind detail. This is a real bottom-sheet, but
  it is triggered by intent (a tap) and closes cleanly; the collapsed/
  default state stays minimal.
- Confirms the same shape as nullschool: **glance data is ambient and
  free; detail is opt-in and dismissible.**

### Tonight (this repo) — already-locked precedent for the same rules

`apps/tonight/` already proves the "Under the Moon" family of art
direction can do compact, tethered, on-demand detail without boxes: a
hairline top border (no full border, no shadow, no radius), width capped
at `min(17rem, 100vw - 2*edge)`, `pointer-events: none` on the container
so it never blocks interaction with the field behind it, and it is
populated/shown only on `pickObject`. This is the in-house version of
the same pattern nullschool uses, already compliant with
`tide-art-direction.md`'s banned list.

## 3. Named patterns and how they differ

| Pattern | Default footprint | Best for | Risk |
|---|---|---|---|
| **Progressive disclosure / disclosure widget** (a toggle that shows/hides a block in place) | Tiny — one line + a toggle | A little more detail behind a glance-first summary | None significant if `aria-expanded` is right (58% of implementations get this wrong per WebAIM's 2023 audit — cite below) |
| **Tethered micro-card** (Tonight's `.card`) | Zero until triggered | Detail about *something specific just tapped* | Needs a clear tap target; not naturally "always partially visible" |
| **Non-modal bottom sheet, peek state** (Google Maps place card, iOS Maps) | A short peek strip, always visible | A persistent glanceable summary that *can* be dragged up | Drag gestures need a keyboard/tap fallback or they fail the accessibility floor |
| **Modal bottom sheet, full detail** (Windy's forecast view) | Full-screen once opened | Deep, dense detail (a table, a week) | Only acceptable as an *opt-in* state, never the default |
| **In-field labels** (Windy's on-map temperatures, Tide's own curve turn labels) | Zero — it's part of the picture | A handful of key numbers, spatially anchored | Doesn't scale to paragraphs of context (source line, hand-off) |

Nielsen Norman Group's [bottom-sheet guidelines](https://www.nngroup.com/articles/bottom-sheet/)
(fetched directly) distil to:
- Use a **non-modal** sheet — background stays interactive — when the
  sheet supplements what's on screen rather than blocking it (this is
  Tide's case: the globe should stay visible and draggable regardless of
  readout state).
- **Never rely on swipe-only dismissal.** Always pair a gesture with a
  visible close/collapse control — important for Tide because the
  existing `<input type=range>` scrub is the keyboard-accessible time
  control, and any new drag affordance must have the same kind of
  fallback.
- **Don't stack sheets**, and don't use the pattern for page-length
  content — if the week (phase 7) and the curve both want to expand at
  once, they should nest inside *one* disclosure, not layer two panels.

## 4. The accessibility and technical toolkit

- **Native `<details>`/`<summary>`** gives a fully keyboard-operable,
  screen-reader-correct expand/collapse with *zero* JavaScript and
  correct `aria-expanded`-equivalent semantics for free — worth using
  for anything that is genuinely just "show more of the same content,"
  which is most of what Tide would be hiding (the week, moon/sun, source
  detail). Its default disclosure triangle (`::marker`) can be hidden
  and replaced with the existing `.word` control styling (an underline,
  per the art direction) without fighting the browser's UA styles too
  hard. Where the toggle needs to look exactly like Tide's other
  controls and `<summary>`'s cross-browser quirks get in the way, a
  plain `<button aria-expanded="…" aria-controls="…">` + `hidden` on
  the target region is the documented fallback (W3C ARIA Authoring
  Practices, "Disclosure (Show/Hide)" pattern) and is what the app
  already does for the About panel (`showAbout()` in `tide.js`) — so
  there is already a working, tested implementation of this exact
  pattern to extend rather than invent.
- **`dvh`/`svh`/`lvh`** (Baseline-available since June 2025, ~95% of
  users covered) solve the classic mobile "100vh is taller than what's
  actually visible because the browser chrome is still on screen"
  problem — relevant for capping an expanded panel's `max-height`
  without it running under the browser's own UI. `svh` (smallest
  possible viewport) is the safe choice for a cap that must never get
  covered; `dvh` is right for something that should breathe with the
  chrome as it hides. Avoid animating `dvh` directly (it can jitter as
  the value changes mid-scroll) — animate a fixed pixel height computed
  once, the way `sizeCurve()` already does for the curve canvas.
- **`ResizeObserver`** is the standing upgrade Tide doesn't have yet:
  `layout()` currently calls `el.readout.getBoundingClientRect()` and
  `el.locate.getBoundingClientRect()` on every `paint()` — i.e. up to 30
  times a second — to decide where the globe sits. A `ResizeObserver` on
  the readout (and on the curve, already doing something similar in
  `sizeCurve()`) would replace that with an event that only fires when
  the box actually changes size, which matters more once the readout can
  change height on demand (expanding/collapsing) rather than being a
  fixed shape. Worth doing alongside whichever disclosure approach gets
  picked, not as a separate task.
- **Reduced motion**: any expand/collapse transition needs the same
  guard already used elsewhere (`REDUCED` in `tide.js`) — snap instantly
  rather than animate height/opacity.

## 5. Three shapes this could take for Tide, smallest change first

All three keep the LOCKED art direction intact: rows under hairlines, no
boxes/blur/shadow/radius, `.word`-style text controls, Fraunces +
Space Grotesk. None of these are decided — they're options, ordered by
how much they touch.

**A. Glance-first readout (smallest change).** Show only place, state
line, and the next turn by default (3 lines, ~15% of current height).
Everything else the readout currently always shows — the curve, the
remaining turns, range/springs, moon, sun, source, hand-off — sits
behind one `<details>`-style disclosure control styled as a `.word`
("More" / "Less", matching the existing `.word` underline treatment
used by Now/Play/Where/About). This is the direct application of what
nullschool and Tonight already do, reuses the About panel's proven
show/hide code path, and needs no gesture handling at all. Weakest part:
it hides the curve by default, which phase 6 was just built to surface —
so the disclosure's *first* line inside it should probably be the curve
specifically, or the always-visible summary should expand to 4 lines
(add the next turn's time) rather than 3.

**B. Peek-strip bottom placement.** Move the readout's glance line (place
+ state) to a slim strip pinned at the bottom, above the existing
`#controls` bar, always visible; tap it (or drag it, with a tap
fallback) to reveal the rest as a sheet that rises from there. Closer to
the Google Maps / Windy peek pattern. Bigger change: it relocates chrome
that currently anchors top-left (where Tonight's placard lives too, for
consistency across the two apps), and needs real drag physics plus the
keyboard/tap fallback NN/g calls out. Better if a future phase (7, the
week) wants a genuinely tall, scrollable panel — a disclosure block
inside a fixed-position readout gets awkward past a certain height,
where a sheet that owns the bottom of the viewport does not.

**C. Hybrid — glance stays top-left, detail becomes a dismissible
overlay (closest to Windy's own resolution).** Keep place + state +
curve as the permanent glance (this is genuinely the "answer" per
`tide-v2-plan.md`'s own goal — the curve is the single biggest lift
phase 6 delivered, so it shouldn't be hidden by default). Move only the
*list* content that scales with more data — the week (phase 7), the full
turn list beyond the next one, moon/sun detail, source/hand-off — into
one `.word`-triggered panel, opened on demand, sized to `max-height:
70svh`, dismissible the same way `#about` already is. This is the
option that ages best into phase 7–9, since "the week" is exactly the
kind of longer, denser content NN/g says belongs in an opt-in sheet
rather than a permanently-open one.

**DECIDED 2026-09-16: Option C.** Built in `apps/tide/` the same day.
The permanent glance is now rule + place + state + curve. Everything
that scales with more data — the remaining turns, range/springs, moon,
sun — sits behind a `.word`-styled "Detail" / "Less" toggle
(`#btn-detail` → `#ro-detail`), collapsed by default, reusing the exact
show/hide shape the About panel already used (`hidden` attribute +
`aria-expanded`, no JS framework, no new pattern to learn). Source and
the hand-off line stay outside the toggle, always visible, per §3's
call that safety-adjacent text shouldn't be opt-in.

**What actually got built, past the plan:**
- `sizeDetail()` measures the real gap between the panel and the
  controls bar (`controlsTop - top - 16`, capped at `70svh`) and sets it
  as an inline `max-height`, so the panel is *provably* never able to
  push content past the controls, on any viewport — not a guess, a
  measurement, the same discipline the curve's `sizeCurve()` already
  uses.
- The panel scrolls internally (`overflow-y: auto`) rather than
  truncating — better than what the short-viewport media query used to
  do (silently dropping turns 3–4 and hiding moon/sun with no way to
  reach them). That media query's truncation rules were removed as
  redundant now that the default state is already compact.
- `layout()`'s phone-specific "shrink the globe to fit below the
  readout" branch now only applies while Detail is *closed* — an open
  Detail panel is treated like `#about`/`#locate` already are: it
  overlays the globe translucently rather than fighting it for space,
  since there usually isn't room for both a full detail panel and a
  repositioned globe on a short phone.
- Escape closes Detail (added to the existing About/Locate Escape
  chain), and closing it (any way) returns focus to the toggle button —
  matching `showAbout()`'s convention, and cheap insurance against focus
  getting lost if a future phase adds a focusable child inside the panel.
- The scroll thumb is styled as a 3px hairline in `--chrome-line`
  (`scrollbar-width: thin` + `::-webkit-scrollbar`) rather than left as
  the browser's default grey bar, which read as a generic-UI tell.

**Verified**, not just built: default-collapsed state fits 320×690,
375×560, 375×480 and 320×500 with zero page scroll (checked
`document.body.scrollHeight === innerHeight` directly, not eyeballed);
Detail opens/closes correctly on both the NOAA and Open-Meteo data
paths; the panel's measured `max-height` stays below the controls bar's
top edge at every size tested; Escape and the focus-return both work.
One real bug surfaced and fixed along the way, unrelated to the panel
itself: the local test server (Python's single-process `http.server`,
long-running across many navigations in one browser session) combined
with the browser's own HTTP cache made a plain `fetch('index.html',
{cache:'reload'})` bust the wrong cache key (`/index.html`, not the `/`
the page actually loads from) — several apparent crashes during testing
were stale pre-Detail markup being served to current JS, not a code
defect. Ground truth going forward: read what the browser actually
received via network-request inspection, not curl (which hit the
correct content the whole time and was misleading).

## Sources

- [Bottom Sheets: Definition and UX Guidelines — NN/g](https://www.nngroup.com/articles/bottom-sheet/)
- [Sheets — Material Design 2](https://m2.material.io/components/sheets-bottom)
- [Sheets — Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/sheets)
- [Progressive disclosure — Wikipedia (Nielsen, 1995)](https://en.wikipedia.org/wiki/Progressive_disclosure)
- [Disclosure (Show/Hide) Pattern — W3C ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure)
- [WebAIM: Disclosures and Accordions](https://webaim.org/techniques/disclosures/)
- [CSS dvh — Dynamic Viewport Height Explained](https://savvy.co.il/en/blog/css/css-dynamic-viewport-height-dvh/)
- [earth.nullschool.net](https://earth.nullschool.net) — inspected live, desktop + 375×700
- [windy.com](https://windy.com) — inspected live, 375×700
