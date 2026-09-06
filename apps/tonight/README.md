# Tonight

The sky above you, right now, as a horizon panorama. It finds you (device
location or a search box), then draws twilight, the moon, the naked-eye
planets, the Milky Way band and the bright stars where they actually are
above your horizon — face a direction and swipe to turn. It opens on *now*;
a play button drifts time forward and a scrub runs dusk→dawn. One free
weather call adds a cloud veil and a plain verdict ("mostly clear after
11"). Tap any object for a card: name, height, rise/set, a sentence of
advice. Everything astronomical is computed in the browser.

**Design direction:** Nocturne + two borrows — see
[`../../docs/tonight-art-direction.md`](../../docs/tonight-art-direction.md).
The gradient is the interface: one continuously computed OKLCH colour field
driven by the sun's altitude, minimal bottom-weighted chrome, no hard
horizon line, static grain, soft bloom on the moon/planets/bright stars
only. A faint alt/az graticule appears only while you drag; a hairline
leader line tethers a tapped object to its card.

**Status:** in progress. Phase 1 (skeleton) built; see
`../../docs/tonight-build-plan.md` for the phase plan and
`../../PROJECT_STATE.md` for current state.

**Cost:** nothing. Pure static HTML/CSS/JS, no backend, no build step. The
only runtime network is two keyless, CORS-open Open-Meteo calls — geocoding
(only when you use the search box) and cloud cover (cached ~1 h) — and the
sky still renders fully offline without them. Vendors `astronomy-engine`
(`lib/astronomy.js`, ~116 KB, MIT) locally; no CDNs.

**To remove:** delete `apps/tonight/` and run
`aws s3 rm s3://<bucket>/tonight/ --recursive`.
