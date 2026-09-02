# Until

Tells you how long until something happens, and then makes it worth watching.
You type an event name, a date and a time (or tap a quiet shortcut — *End of
today*, *Tomorrow morning*, *This weekend*, *New Year*) and the page slides into
a full-screen, cinematic countdown. The practical answer is always right there
in calm units (`2 hours · 14 minutes`, `3 days · 7 hours`; seconds only appear
under an hour), but the remaining time is also drawn three ways, switchable with
subtle controls: **lights** (one glowing point per remaining minute/hour/day in
an organic field that breathes as one body; spent points dissolve over 8–15s
rather than blink), **orbit** (the full duration is one arc around a hazy central
light, the present moment travelling toward a hairline tick, its colour drifting
warm→cool along the path) and **horizon** (a light source descending toward a
minimal landscape as the moment nears — volumetric fog and marched god-rays in a
single WebGL pass, with a Canvas2D version as the fallback). It updates live.
*Keep this open* strips away the chrome so the visualization becomes an ambient
display (move the mouse or press Esc to leave). Past events aren't errors — the
view flips to *That was 2 hours ago.* and each visualization carries on past its
mark. The most recent event is saved to `localStorage`, so a refresh puts you
back where you were. Type is set in Fraunces (heading, event name) and Space
Grotesk (the countdown number), both self-hosted. Respects
`prefers-reduced-motion` (no twinkle, pulse, trails, bloom animation or WebGL;
the Canvas2D horizon is used and repaint settles to ~1 Hz) and works on desktop
and mobile.

**Cost:** nothing. Pure static HTML/CSS/JS — no backend, no build, no runtime
network calls, no CDNs. Ships ~167 KB of self-hosted variable woff2 fonts
(`fonts/`, SIL OFL 1.1, licenses included) that load once from the same origin.

**To remove:** delete `apps/until/` and run `aws s3 rm s3://<bucket>/until/ --recursive`.
