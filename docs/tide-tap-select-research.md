# Tide — tap the globe to set your place

Research only. No code changed. The ask: typing a place every time is
friction; tap the globe and snap there instead. The user's own first
idea was a toggle that turns "tap-to-snap" on or off — floated with a
genuine "or is there a better idea," so this is a real research pass,
not a rubber stamp.

## 1. The precedent, checked directly, not assumed

Every major map app (Google Maps, Apple Maps, and — per a 2026 UX
survey of the pattern — most ride-share, delivery, and logistics apps
that let you pick a point on a map) converged on the same split:

- **A quick tap on empty map** does nothing, or at most shows a subtle
  hint of what's there. It never commits to anything.
- **A long press (touch-and-hold, ~500ms–1s, no movement)** drops a pin
  at that exact spot. This is the deliberate "place a point" gesture,
  distinct from a tap and distinct from a drag.
- **A tap on an *existing* marker** opens it — an info card, not a new
  pin.

The reasoning holds up mechanically, not just by convention: a drag
already means "look around" on a map (and on Tide's globe). A long
press is the one gesture that's neither a tap nor a drag, so it's the
only one left to safely mean "select this point" without colliding with
what your thumb is already doing 95% of the time.

**Windy.com** (inspected live for `tide-panel-research.md`) does
something specifically relevant here: tapping a place shows a detail
*peek*, but does **not** silently replace whatever location you had
already been looking at — committing to a place is a separate, explicit
step. That two-step shape (see something, then decide to keep it) is
worth carrying over independent of which gesture triggers step one.

## 2. Why the toggle is worth talking out of, not just building

The toggle idea solves the real problem (don't let an accidental tap
nuke my saved place) but it introduces a different, well-documented
failure mode: **a mode**. Jef Raskin's *The Humane Interface* names this
directly — *"modes are a significant source of errors, confusion,
unnecessary restrictions, and complexity in interfaces"* — because the
same action (tapping the globe) now means two different things
depending on invisible state the user has to remember. The exact
failure is familiar from every app that's ever had a "select mode" you
forgot was on: you tap to look at something, and it quietly replaces
your place instead, and the *fix* for that (a visible mode indicator,
a reminder, a confirmation) usually ends up adding more chrome than the
toggle saved. Tide's whole design language has consistently avoided
this shape of problem already — no legend, no persistent settings
panel, nothing that requires remembering a prior choice to interpret a
current one.

The long-press pattern above sidesteps the need for a mode at all: the
gesture itself carries the intent, every time, with no state to forget.
That's the recommendation — not a toggle, and not a plain tap either,
but long-press, exactly matching what a very large number of people
already know from Maps.

## 3. What Tide already has that makes this cheap

- **The tap/drag split is already half-built.** `endDrag()` already
  computes `!d.moved` — whether the pointer moved during the gesture —
  and currently does nothing with a true "no movement" case but log
  telemetry (`if (!d.moved && view.mode === 'moon') track('tap');`).
  Extending this to time the hold and act on a genuine long-press is a
  small addition to code that already exists, not new plumbing.
- **`nearestCoast(lat, lon)`** already exists (used today for the
  inland-grace message) and does exactly the snapping this needs: given
  a raw lat/lon, it returns the nearest point on the 50m coastline. A
  long-press on open ocean should snap to the coast the same way typing
  "the middle of the Pacific" would fail gracefully today.
- **Tonight's tethered card** (`.card`, leader line, `pickObject`) is
  the in-house precedent for "you touched a point, here's a small
  card about it, tethered by a hairline, dismissible" — already proven
  under this exact art direction. Reusing that shape for a place preview
  keeps this from inventing new visual language.

## 4. The recommended shape

1. **Long-press the globe** (pointerdown, held ~500ms with the pointer
   not moving more than a few px) at a point on open ocean or near a
   coast.
2. Snap the raw point through `nearestCoast()`, the same as today's
   inland handling.
3. Show a **preview**, not a commit: a small tethered card (Tonight's
   pattern) near the touched point — the nearest coast's rough
   position, and a `.word`-styled **"Use this place"** action. Dismiss
   by tapping elsewhere, Escape, or letting it sit (non-modal, like the
   curve and the coast marker already are).
4. Only on "Use this place" does it become the saved place: reverse-geocode
   isn't strictly needed for the fly-to/data fetch (which only need
   lat/lon), but a name is worth having for the readout's `ro-place`
   line. **Checked directly:** Open-Meteo's own geocoder has no reverse
   endpoint (`/v1/reverse` 404s). [BigDataCloud's reverse-geocode-client
   API](https://www.bigdatacloud.com/) does — keyless, CORS-open,
   confirmed live (`api.bigdatacloud.net/data/reverse-geocode-client
   ?latitude=…&longitude=…&localityLanguage=en`), and returned
   `"Brighton and Hove"` for a real coordinate test. That's the source
   to use; no open question left here.
5. A short *tap* (no hold) stays exactly what it is today — nothing
   special — leaving room to use it for something else later (e.g. a
   station marker, if phase 11's coverage work ever renders them)
   without colliding with this.

**Accessibility:** long-press has no clean keyboard equivalent, so this
is additive, never a replacement for the search box — exactly the same
"progressive enhancement, nothing lost without it" rule already applied
to the curve's drag-to-scrub. Keyboard and screen-reader users keep
typing a place exactly as they do today.

**Fits the locked direction as-is:** no new colour, no legend, no
toggle switch to design or explain, reuses a hairline+card shape
already proven under this exact palette.

Nothing here has been built. Say if this is the direction to take.
